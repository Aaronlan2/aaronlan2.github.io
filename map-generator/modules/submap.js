"use strict";

window.Submap = (function () {
  const isWater = (pack, id) => pack.cells.h[id] < 20;
  const inMap = (x, y) => x > 0 && x < graphWidth && y > 0 && y < graphHeight;

  /*
    generate new map based on an existing one (resampling parentMap)
    parentMap: {seed, grid, pack} from original map
    options = {
      projection: f(Number,Number)->[Number, Number]
                  function to calculate new coordinates
      inverse: g(Number,Number)->[Number, Number]
                inverse of f
      depressRivers: Bool     carve out riverbeds?
      smoothHeightMap: Bool   run smooth filter on heights
      addLakesInDepressions:  call FMG original funtion on heightmap

      lockMarkers: Bool       Auto lock all copied markers
      lockBurgs: Bool         Auto lock all copied burgs
      }
    */
  function resample(parentMap, options) {
    const projection = options.projection;
    const inverse = options.inverse;
    const stage = s => INFO && console.info("子地图：", s);
    const timeStart = performance.now();
    invokeActiveZooming();

    // 复制种子值
    seed = parentMap.seed;
    Math.random = aleaPRNG(seed);
    INFO && console.group("子地图种子：" + seed);

    applyGraphSize();
    grid = generateGrid();

    drawScaleBar(scaleBar, scale);
    fitScaleBar(scaleBar, svgWidth, svgHeight);

    const resampler = (points, qtree, f) => {
      for (const [i, [x, y]] of points.entries()) {
        const [tx, ty] = inverse(x, y);
        const oldid = qtree.find(tx, ty, Infinity)[2];
        f(i, oldid);
      }
    };

    stage("重采样高程图、温度和降水量");
    // 从旧世界状态重采样高程图
    const n = grid.points.length;
    grid.cells.h = new Uint8Array(n); // 高程图
    grid.cells.temp = new Int8Array(n); // 温度
    grid.cells.prec = new Uint8Array(n); // 降水量
    const reverseGridMap = new Uint32Array(n); // 从新单元格到旧单元格的映射

    const oldGrid = parentMap.grid;
    // 构建缓存：旧单元格 -> [新单元格列表]
    const forwardGridMap = parentMap.grid.points.map(_ => []);
    resampler(grid.points, parentMap.pack.cells.q, (id, oldid) => {
      const cid = parentMap.pack.cells.g[oldid];
      grid.cells.h[id] = oldGrid.cells.h[cid];
      grid.cells.temp[id] = oldGrid.cells.temp[cid];
      grid.cells.prec[id] = oldGrid.cells.prec[cid];
      if (options.depressRivers) forwardGridMap[cid].push(id);
      reverseGridMap[id] = cid;
    });
    // TODO: 为高度、温度、降水量添加平滑/噪声函数n次

    // 平滑高程图
    // 平滑操作不应改变单元格类型（陆地→水域或水域→陆地）

    if (options.smoothHeightMap) {
      const gcells = grid.cells;
      gcells.h.forEach((h, i) => {
        const hs = gcells.c[i].map(c => gcells.h[c]);
        hs.push(h);
        gcells.h[i] = h >= 20 ? Math.max(d3.mean(hs), 20) : Math.min(d3.mean(hs), 19);
      });
    }

    if (options.depressRivers) {
      stage("生成河床");
      const rbeds = new Uint16Array(grid.cells.i.length);

      // 侵蚀河床
      parentMap.pack.rivers.forEach(r =>
        r.cells.forEach(oldpc => {
          if (oldpc < 0) return; // 忽略地图外标记（-1）
          const oldc = parentMap.pack.cells.g[oldpc];
          const targetCells = forwardGridMap[oldc];
          if (!targetCells) throw "目标单元格不应为空";
          targetCells.forEach(c => {
            if (grid.cells.h[c] < 20) return;
            rbeds[c] = 1;
          });
        })
      );
      // 抬高所有陆地单元格（河床除外）
      grid.cells.h.forEach((h, i) => {
        if (rbeds[i] || h < 20) return;
        grid.cells.h[i] = Math.min(h + 2, 100);
      });
    }

    stage("检测地形特征、海洋并生成湖泊");
    Features.markupGrid();

    addLakesInDeepDepressions();
    openNearSeaLakes();

    OceanLayers();

    calculateMapCoordinates();
    calculateTemperatures();
    generatePrecipitation();
    stage("单元格清理");
    reGraph();

    // 移除分类错误的单元格
    stage("定义海岸线");
    Features.markupPack();
    createDefaultRuler();

    // 打包图形
    const oldCells = parentMap.pack.cells;
    const forwardMap = parentMap.pack.cells.p.map(_ => []); // 旧单元格 → [新单元格列表]

    const pn = pack.cells.i.length;
    const cells = pack.cells;
    cells.culture = new Uint16Array(pn);
    cells.state = new Uint16Array(pn);
    cells.burg = new Uint16Array(pn);
    cells.religion = new Uint16Array(pn);
    cells.province = new Uint16Array(pn);

    stage("重采样文化、国家和宗教地图");
    for (const [id, gridCellId] of cells.g.entries()) {
      const oldGridId = reverseGridMap[gridCellId];
      if (oldGridId === undefined) {
        console.error("无法找到旧单元格ID", reverseGridMap, "在", gridCellId);
        continue;
      }
      // 查找旧单元格的子单元格
      const oldChildren = oldCells.i.filter(oid => oldCells.g[oid] == oldGridId);
      let oldid; // 原始地图上的匹配单元格

      if (!oldChildren.length) {
        // 这一定是（已删除的）深海单元格
        if (!oldGrid.cells.h[oldGridId] < 20) {
          console.error(`警告，${gridCellId}应为水域单元格，而非${oldGrid.cells.h[oldGridId]}`);
          continue;
        }
        // 查找替代单元格：最近的水域单元格
        const [ox, oy] = cells.p[id];
        const [tx, ty] = inverse(x, y);
        oldid = oldCells.q.find(tx, ty, Infinity)[2];
        if (!oldid) {
          console.warn("警告，在四叉树中未找到ID", id, "父单元格：", gridCellId);
          continue;
        }
      } else {
        // 在父地图上查找最近的子单元格（打包单元格）
        const distance = x => (x[0] - cells.p[id][0]) **2 + (x[1] - cells.p[id][1])** 2;
        let d = Infinity;
        oldChildren.forEach(oid => {
          // 除非某些算法修改了高度，否则这应该始终为真！
          if (isWater(parentMap.pack, oid) !== isWater(pack, id)) {
            console.warn(`因添加洼地湖泊，单元格${oid}被淹没`);
          }
          const [oldpx, oldpy] = oldCells.p[oid];
          const nd = distance(projection(oldpx, oldpy));
          if (isNaN(nd)) {
            console.error("距离不是有效数字！旧坐标：", oldpx, oldpy);
          }
          if (nd < d) [d, oldid] = [nd, oid];
        });
        if (oldid === undefined) {
          console.warn("警告，未找到匹配项", id, "（父单元格：", gridCellId, "）");
          continue;
        }
      }

      if (isWater(pack, id) !== isWater(parentMap.pack, oldid)) {
        WARN && console.warn("检测到类型不一致：", id, oldid, `${pack.cells.t[id]} != ${oldCells.t[oldid]}`);
      }

      cells.culture[id] = oldCells.culture[oldid];
      cells.state[id] = oldCells.state[oldid];
      cells.religion[id] = oldCells.religion[oldid];
      cells.province[id] = oldCells.province[oldid];
      // reverseMap.set(id, oldid)
      forwardMap[oldid].push(id);
    }

    stage("重新生成河流网络");
    Rivers.generate();

    // 基于（重采样的）grid.cells.temp和prec计算生物群系
    // 重新计算是安全的
    stage("重新生成生物群系");
    Biomes.define();
    // 重新计算适宜性和人口
    // TODO: 根据基础地图进行标准化
    rankCells();

    stage("迁移文化");
    pack.cultures = parentMap.pack.cultures;
    // 修正文化中心
    const validCultures = new Set(pack.cells.culture);
    pack.cultures.forEach((c, i) => {
      if (!i) return; // 忽略荒野
      if (!validCultures.has(i)) {
        c.removed = true;
        c.center = null;
        return;
      }
      const newCenters = forwardMap[c.center];
      c.center = newCenters.length ? newCenters[0] : pack.cells.culture.findIndex(x => x === i);
    });

    stage("迁移并锁定城镇");
    copyBurgs(parentMap, projection, options);

    // 迁移国家，将无陆地的国家标记为已移除
    stage("迁移国家");
    const validStates = new Set(pack.cells.state);
    pack.states = parentMap.pack.states;
    // 仅保留有效国家及其邻国
    pack.states.forEach((s, i) => {
      if (!s.i || s.removed) return; // 忽略已移除和中立国家
      if (!validStates.has(i)) s.removed = true;
      s.neighbors = s.neighbors.filter(n => validStates.has(n));

      // 查找中心
      s.center = pack.burgs[s.capital].cell
        ? pack.burgs[s.capital].cell // 首都为最佳选择
        : pack.cells.state.findIndex(x => x === i); // 否则使用第一个有效单元格
    });
    BurgsAndStates.getPoles();

    // 迁移省份，将无陆地的省份标记为已移除
    stage("迁移省份");
    const validProvinces = new Set(pack.cells.province);
    pack.provinces = parentMap.pack.provinces;
    // 标记不必要的省份
    pack.provinces.forEach((p, i) => {
      if (!p || p.removed) return;
      if (!validProvinces.has(i)) {
        p.removed = true;
        return;
      }
      const newCenters = forwardMap[p.center];
      p.center = newCenters.length ? newCenters[0] : pack.cells.province.findIndex(x => x === i);
    });
    Provinces.getPoles();

    stage("重新生成路线网络");
    regenerateRoutes();

    Rivers.specify();
    Features.specify();

    stage("迁移军事力量");
    for (const s of pack.states) {
      if (!s.military) continue;
      for (const m of s.military) {
        [m.x, m.y] = projection(m.x, m.y);
        [m.bx, m.by] = projection(m.bx, m.by);
        const cc = forwardMap[m.cell];
        m.cell = cc && cc.length ? cc[0] : null;
      }
      s.military = s.military.filter(m => m.cell).map((m, i) => ({...m, i}));
    }

    stage("复制标记");
    for (const m of pack.markers) {
      const [x, y] = projection(m.x, m.y);
      if (!inMap(x, y)) {
        Markers.deleteMarker(m.i);
      } else {
        m.x = x;
        m.y = y;
        m.cell = findCell(x, y);
        if (options.lockMarkers) m.lock = true;
      }
    }
    if (layerIsOn("toggleMarkers")) drawMarkers();

    stage("重新生成区域");
    Zones.generate();
    Names.getMapName();
    stage("恢复备注");
    notes = parentMap.notes;
    stage("子地图生成完成");

    WARN && console.warn(`总计：${rn((performance.now() - timeStart) / 1000, 2)}秒`);
    showStatistics();
    INFO && console.groupEnd("生成地图 " + seed);
  }

  /* 查找最近的满足过滤器f的单元格，且该单元格至少有一个满足过滤器g的邻居，
   * 最大单元格距离为`max`
   * 返回[cellid, neighbor]元组，若无此类单元格则返回undefined
   * 接受坐标（x, y）
   */
  const findNearest =
    (f, g, max = 3) =>
    (px, py) => {
      const d2 = c => (px - pack.cells.p[c][0]) **2 + (py - pack.cells.p[c][0])** 2;
      const startCell = findCell(px, py);
      const tested = new Set([startCell]); // 忽略已分析的单元格
      const kernel = (cs, level) => {
        const [bestf, bestg] = cs.filter(f).reduce(
          ([cf, cg], c) => {
            const neighbors = pack.cells.c[c];
            const betterg = neighbors.filter(g).reduce((u, x) => (d2(x) < d2(u) ? x : u));
            if (cf === undefined) return [c, betterg];
            return betterg && d2(cf) < d2(c) ? [c, betterg] : [cf, cg];
          },
          [undefined, undefined]
        );
        if (bestf && bestg) return [bestf, bestg];

        // 未找到合适的配对，使用下一圈单元格重试
        const targets = new Set(cs.map(c => pack.cells.c[c]).flat());
        const ring = Array.from(targets).filter(nc => !tested.has(nc));
        if (level >= max || !ring.length) return [undefined, undefined];
        ring.forEach(c => tested.add(c));
        return kernel(ring, level + 1);
      };
      const pair = kernel([startCell], 1);
      return pair;
    };

  function copyBurgs(parentMap, projection, options) {
    const cells = pack.cells;
    pack.burgs = parentMap.pack.burgs;

    // 将城镇重新映射到最佳新单元格
    pack.burgs.forEach((b, id) => {
      if (id == 0) return; // 跳过中立国家的空城镇
      [b.x, b.y] = projection(b.x, b.y);
      b.population = b.population * options.scale; // 根据人口比例变化调整

      // 禁用地图外（已移除）的城镇
      if (!inMap(b.x, b.y)) {
        b.removed = true;
        b.cell = null;
        return;
      }

      const cityCell = findCell(b.x, b.y);
      let searchFunc;
      const isFreeLand = c => cells.t[c] === 1 && !cells.burg[c];
      const nearCoast = c => cells.t[c] === -1;

      // 检查是否需要重新定位城镇
      if (cells.burg[cityCell])
        // 已被占用
        searchFunc = findNearest(isFreeLand, _ => true, 3);

      if (isWater(pack, cityCell) || b.port)
        // 城镇位于水域或为港口
        searchFunc = findNearest(isFreeLand, nearCoast, 6);

      if (searchFunc) {
        const [newCell, neighbor] = searchFunc(b.x, b.y);
        if (!newCell) {
          WARN && console.warn(`无法重新定位城镇：${b.name}已沉没并被毁。:-(`);
          b.cell = null;
          b.removed = true;
          return;
        }

        [b.x, b.y] = b.port ? getCloseToEdgePoint(newCell, neighbor) : cells.p[newCell];
        if (b.port) b.port = cells.f[neighbor]; // 复制地形特征编号
        b.cell = newCell;
        if (b.port && !isWater(pack, neighbor)) console.error("错误！邻居必须为水域！", b);
      } else {
        b.cell = cityCell;
      }
      if (b.i && !b.lock) b.lock = options.lockBurgs;
      cells.burg[b.cell] = id;
    });
  }

  function getCloseToEdgePoint(cell1, cell2) {
    const {cells, vertices} = pack;

    const [x0, y0] = cells.p[cell1];

    const commonVertices = cells.v[cell1].filter(vertex => vertices.c[vertex].some(cell => cell === cell2));
    const [x1, y1] = vertices.p[commonVertices[0]];
    const [x2, y2] = vertices.p[commonVertices[1]];
    const xEdge = (x1 + x2) / 2;
    const yEdge = (y1 + y2) / 2;

    const x = rn(x0 + 0.95 * (xEdge - x0), 2);
    const y = rn(y0 + 0.95 * (yEdge - y0), 2);

    return [x, y];
  }

  // 导出
  return {resample, findNearest};
})();