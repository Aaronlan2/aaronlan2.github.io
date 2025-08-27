"use strict";

window.BurgsAndStates = (() => {
  const generate = () => {
    const {cells, cultures} = pack;
    const n = cells.i.length;

    cells.burg = new Uint16Array(n); // 单元格对应的城镇

    const burgs = (pack.burgs = placeCapitals());
    pack.states = createStates();

    placeTowns();
    expandStates();
    normalizeStates();
    getPoles();

    specifyBurgs();

    collectStatistics();
    assignColors();

    generateCampaigns();
    generateDiplomacy();

    function placeCapitals() {
      TIME && console.time("放置首都");
      let count = +byId("statesNumber").value;
      let burgs = [0];

      const rand = () => 0.5 + Math.random() * 0.5;
      const score = new Int16Array(cells.s.map(s => s * rand())); // 用于首都放置的单元格得分
      const sorted = cells.i.filter(i => score[i] > 0 && cells.culture[i]).sort((a, b) => score[b] - score[a]); // 过滤并排序后的索引数组

      if (sorted.length < count * 10) {
        count = Math.floor(sorted.length / 10);
        if (!count) {
          WARN && console.warn("没有有人居住的区域，无法生成国家");
          return burgs;
        } else {
          WARN && console.warn(`有人居住的区域不足（${sorted.length}）。仅会生成${count}个国家`);
        }
      }

      let burgsTree = d3.quadtree();
      let spacing = (graphWidth + graphHeight) / 2 / count; // 首都之间的最小距离

      for (let i = 0; burgs.length <= count; i++) {
        const cell = sorted[i];
        const [x, y] = cells.p[cell];

        if (burgsTree.find(x, y, spacing) === undefined) {
          burgs.push({cell, x, y});
          burgsTree.add([x, y]);
        }

        if (i === sorted.length - 1) {
          WARN && console.warn("无法以当前间距放置首都。尝试减小间距重新放置");
          burgsTree = d3.quadtree();
          i = -1;
          burgs = [0];
          spacing /= 1.2;
        }
      }

      burgs[0] = burgsTree;
      TIME && console.timeEnd("放置首都");
      return burgs;
    }

    // 为每个首都创建一个国家
    function createStates() {
      TIME && console.time("创建国家");
      const states = [{i: 0, name: "中立地区"}];
      const colors = getColors(burgs.length - 1);
      const each5th = each(5);

      burgs.forEach((b, i) => {
        if (!i) return; // 跳过第一个元素

        // 城镇数据
        b.i = b.state = i;
        b.culture = cells.culture[b.cell];
        b.name = Names.getCultureShort(b.culture);
        b.feature = cells.f[b.cell];
        b.capital = 1;

        // 国家数据
        const expansionism = rn(Math.random() * byId("sizeVariety").value + 1, 1);
        const basename = b.name.length < 9 && each5th(b.cell) ? b.name : Names.getCultureShort(b.culture);
        const name = Names.getState(basename, b.culture);
        const type = cultures[b.culture].type;

        const coa = COA.generate(null, null, null, type);
        coa.shield = COA.getShield(b.culture, null);
        states.push({
          i,
          color: colors[i - 1],
          name,
          expansionism,
          capital: i,
          type,
          center: b.cell,
          culture: b.culture,
          coa
        });
        cells.burg[b.cell] = i;
      });

      TIME && console.timeEnd("创建国家");
      return states;
    }

    // 基于地理和经济评估放置次要定居点
    function placeTowns() {
      TIME && console.time("放置城镇");
      const score = new Int16Array(cells.s.map(s => s * gauss(1, 3, 0, 20, 3))); // 用于城镇放置的略带随机性的单元格得分
      const sorted = cells.i
        .filter(i => !cells.burg[i] && score[i] > 0 && cells.culture[i])
        .sort((a, b) => score[b] - score[a]); // 过滤并排序后的索引数组

      const desiredNumber =
        manorsInput.value == 1000
          ? rn(sorted.length / 5 / (grid.points.length / 10000) ** 0.8)
          : manorsInput.valueAsNumber;
      const burgsNumber = Math.min(desiredNumber, sorted.length); // 要生成的城镇数量
      let burgsAdded = 0;

      const burgsTree = burgs[0];
      let spacing = (graphWidth + graphHeight) / 150 / (burgsNumber **0.7 / 66); // 城镇之间的最小距离

      while (burgsAdded < burgsNumber && spacing > 1) {
        for (let i = 0; burgsAdded < burgsNumber && i < sorted.length; i++) {
          if (cells.burg[sorted[i]]) continue;
          const cell = sorted[i];
          const [x, y] = cells.p[cell];
          const s = spacing * gauss(1, 0.3, 0.2, 2, 2); // 随机化以避免放置过于均匀
          if (burgsTree.find(x, y, s) !== undefined) continue; // 离现有城镇太近
          const burg = burgs.length;
          const culture = cells.culture[cell];
          const name = Names.getCulture(culture);
          burgs.push({cell, x, y, state: 0, i: burg, culture, name, capital: 0, feature: cells.f[cell]});
          burgsTree.add([x, y]);
          cells.burg[cell] = burg;
          burgsAdded++;
        }
        spacing *= 0.5;
      }

      if (manorsInput.value != 1000 && burgsAdded < desiredNumber) {
        ERROR && console.error(`无法放置所有城镇。请求数量${desiredNumber}，实际放置${burgsAdded}`);
      }

      burgs[0] = {name: undefined}; // 不再存储burgTree
      TIME && console.timeEnd("放置城镇");
    }
  };

  // 定义城镇坐标、纹章、港口状态并详细说明
  const specifyBurgs = () => {
    TIME && console.time("详细定义城镇");
    const {cells, features} = pack;
    const temp = grid.cells.temp;

    for (const b of pack.burgs) {
      if (!b.i || b.lock) continue;
      const i = b.cell;

      // 为一些海岸线城镇分配港口状态（温度>0°C）
      const haven = cells.haven[i];
      if (haven && temp[cells.g[i]] > 0) {
        const f = cells.f[haven]; // 水体ID
        // 港口是有任何港口设施的首都，或有良好港口设施的城镇
        const port = features[f].cells > 1 && ((b.capital && cells.harbor[i]) || cells.harbor[i] === 1);
        b.port = port ? f : 0; // 港口由其所在的水体ID定义
      } else b.port = 0;

      // 定义城镇人口（保持约10%的城市化率）
      b.population = rn(Math.max(cells.s[i] / 8 + b.i / 1000 + (i % 100) / 1000, 0.1), 3);
      if (b.capital) b.population = rn(b.population * 1.3, 3); // 增加首都人口

      if (b.port) {
        b.population = b.population * 1.3; // 增加港口人口
        const [x, y] = getCloseToEdgePoint(i, haven);
        b.x = x;
        b.y = y;
      }

      // 添加随机因素
      b.population = rn(b.population * gauss(2, 3, 0.6, 20, 3), 3);

      // 使河流上的城镇略微随机偏移
      if (!b.port && cells.r[i]) {
        const shift = Math.min(cells.fl[i] / 150, 1);
        if (i % 2) b.x = rn(b.x + shift, 2);
        else b.x = rn(b.x - shift, 2);
        if (cells.r[i] % 2) b.y = rn(b.y + shift, 2);
        else b.y = rn(b.y - shift, 2);
      }

      // 定义徽章
      const state = pack.states[b.state];
      const stateCOA = state.coa;
      let kinship = 0.25;
      if (b.capital) kinship += 0.1;
      else if (b.port) kinship -= 0.1;
      if (b.culture !== state.culture) kinship -= 0.25;
      b.type = getType(i, b.port);
      const type = b.capital && P(0.2) ? "Capital" : b.type === "Generic" ? "City" : b.type;
      b.coa = COA.generate(stateCOA, kinship, null, type);
      b.coa.shield = COA.getShield(b.culture, b.state);
    }

    // 如果某水体上只有一个港口，则取消其港口状态
    const ports = pack.burgs.filter(b => !b.removed && b.port > 0);
    for (const f of features) {
      if (!f.i || f.land || f.border) continue;
      const featurePorts = ports.filter(b => b.port === f.i);
      if (featurePorts.length === 1) featurePorts[0].port = 0;
    }

    TIME && console.timeEnd("详细定义城镇");
  };

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

  const getType = (cellId, port) => {
    const {cells, features, burgs} = pack;

    if (port) return "Naval";

    const haven = cells.haven[cellId];
    if (haven !== undefined && features[cells.f[haven]].type === "lake") return "Lake";

    if (cells.h[cellId] > 60) return "Highland";

    if (cells.r[cellId] && cells.fl[cellId] >= 100) return "River";

    const biome = cells.biome[cellId];
    const population = cells.pop[cellId];
    if (!cells.burg[cellId] || population <= 5) {
      if (population < 5 && [1, 2, 3, 4].includes(biome)) return "Nomadic";
      if (biome > 4 && biome < 10) return "Hunting";
    }

    return "Generic";
  };

  const defineBurgFeatures = burg => {
    const {cells} = pack;

    pack.burgs
      .filter(b => (burg ? b.i == burg.i : b.i && !b.removed && !b.lock))
      .forEach(b => {
        const pop = b.population;
        b.citadel = Number(b.capital || (pop > 50 && P(0.75)) || (pop > 15 && P(0.5)) || P(0.1));
        b.plaza = Number(pop > 20 || (pop > 10 && P(0.8)) || (pop > 4 && P(0.7)) || P(0.6));
        b.walls = Number(b.capital || pop > 30 || (pop > 20 && P(0.75)) || (pop > 10 && P(0.5)) || P(0.1));
        b.shanty = Number(pop > 60 || (pop > 40 && P(0.75)) || (pop > 20 && b.walls && P(0.4)));
        const religion = cells.religion[b.cell];
        const theocracy = pack.states[b.state].form === "Theocracy";
        b.temple = Number(
          (religion && theocracy && P(0.5)) || pop > 50 || (pop > 35 && P(0.75)) || (pop > 20 && P(0.5))
        );
      });
  };

  // 在地图上扩张文化（类Dijkstra算法）
  const expandStates = () => {
    TIME && console.time("扩张国家");
    const {cells, states, cultures, burgs} = pack;

    cells.state = cells.state || new Uint16Array(cells.i.length);

    const queue = new FlatQueue();
    const cost = [];

    const globalGrowthRate = byId("growthRate").valueAsNumber || 1;
    const statesGrowthRate = byId("statesGrowthRate")?.valueAsNumber || 1;
    const growthRate = (cells.i.length / 2) * globalGrowthRate * statesGrowthRate; // 国家扩张的成本限制

    // 从所有单元格中移除国家，锁定的除外
    for (const cellId of cells.i) {
      const state = states[cells.state[cellId]];
      if (state.lock) continue;
      cells.state[cellId] = 0;
    }

    for (const state of states) {
      if (!state.i || state.removed) continue;

      const capitalCell = burgs[state.capital].cell;
      cells.state[capitalCell] = state.i;
      const cultureCenter = cultures[state.culture].center;
      const b = cells.biome[cultureCenter]; // 国家的原生生物群系
      queue.push({e: state.center, p: 0, s: state.i, b}, 0);
      cost[state.center] = 1;
    }

    while (queue.length) {
      const next = queue.pop();

      const {e, p, s, b} = next;
      const {type, culture} = states[s];

      cells.c[e].forEach(e => {
        const state = states[cells.state[e]];
        if (state.lock) return; // 不覆盖锁定国家的单元格
        if (cells.state[e] && e === state.center) return; // 不覆盖首都单元格

        const cultureCost = culture === cells.culture[e] ? -9 : 100;
        const populationCost = cells.h[e] < 20 ? 0 : cells.s[e] ? Math.max(20 - cells.s[e], 0) : 5000;
        const biomeCost = getBiomeCost(b, cells.biome[e], type);
        const heightCost = getHeightCost(pack.features[cells.f[e]], cells.h[e], type);
        const riverCost = getRiverCost(cells.r[e], e, type);
        const typeCost = getTypeCost(cells.t[e], type);
        const cellCost = Math.max(cultureCost + populationCost + biomeCost + heightCost + riverCost + typeCost, 0);
        const totalCost = p + 10 + cellCost / states[s].expansionism;

        if (totalCost > growthRate) return;

        if (!cost[e] || totalCost < cost[e]) {
          if (cells.h[e] >= 20) cells.state[e] = s; // 将国家分配给单元格
          cost[e] = totalCost;
          queue.push({e, p: totalCost, s, b}, totalCost);
        }
      });
    }

    burgs.filter(b => b.i && !b.removed).forEach(b => (b.state = cells.state[b.cell])); // 为城镇分配国家

    function getBiomeCost(b, biome, type) {
      if (b === biome) return 10; // 原生生物群系的微小惩罚
      if (type === "Hunting") return biomesData.cost[biome] * 2; // 狩猎型在非原生生物群系的惩罚
      if (type === "Nomadic" && biome > 4 && biome < 10) return biomesData.cost[biome] * 3; // 游牧型在森林生物群系的惩罚
      return biomesData.cost[biome]; // 一般非原生生物群系的惩罚
    }

    function getHeightCost(f, h, type) {
      if (type === "Lake" && f.type === "lake") return 10; // 湖泊型在湖泊穿越的低惩罚
      if (type === "Naval" && h < 20) return 300; // 航海型在海洋穿越的低惩罚
      if (type === "Nomadic" && h < 20) return 10000; // 游牧型在海洋穿越的高额惩罚
      if (h < 20) return 1000; // 一般海洋穿越的惩罚
      if (type === "Highland" && h < 62) return 1100; // 高原型在低地的惩罚
      if (type === "Highland") return 0; // 高原型在高原的无惩罚
      if (h >= 67) return 2200; // 一般山地穿越的惩罚
      if (h >= 44) return 300; // 一般丘陵穿越的惩罚
      return 0;
    }

    function getRiverCost(r, i, type) {
      if (type === "River") return r ? 0 : 100; // 河流型的惩罚
      if (!r) return 0; // 无河流时对其他类型无惩罚
      return minmax(cells.fl[i] / 10, 20, 100); // 基于流量的河流惩罚（20到100之间）
    }

    function getTypeCost(t, type) {
      if (t === 1) return type === "Naval" || type === "Lake" ? 0 : type === "Nomadic" ? 60 : 20; // 海岸线惩罚
      if (t === 2) return type === "Naval" || type === "Nomadic" ? 30 : 0; // 航海型和游牧型在2级陆地的低惩罚
      if (t !== -1) return type === "Naval" || type === "Lake" ? 100 : 0; // 航海型和湖泊型在大陆的惩罚
      return 0;
    }

    TIME && console.timeEnd("扩张国家");
  };

  const normalizeStates = () => {
    TIME && console.time("规整国家");
    const {cells, burgs} = pack;

    for (const i of cells.i) {
      if (cells.h[i] < 20 || cells.burg[i]) continue; // 不覆盖城镇
      if (pack.states[cells.state[i]]?.lock) continue; // 不覆盖锁定国家的单元格
      if (cells.c[i].some(c => burgs[cells.burg[c]].capital)) continue; // 不覆盖首都附近
      const neibs = cells.c[i].filter(c => cells.h[c] >= 20);
      const adversaries = neibs.filter(c => !pack.states[cells.state[c]]?.lock && cells.state[c] !== cells.state[i]);
      if (adversaries.length < 2) continue;
      const buddies = neibs.filter(c => !pack.states[cells.state[c]]?.lock && cells.state[c] === cells.state[i]);
      if (buddies.length > 2) continue;
      if (adversaries.length <= buddies.length) continue;
      cells.state[i] = cells.state[adversaries[0]];
    }
    TIME && console.timeEnd("规整国家");
  };

  // 计算每个国家的最远点
  const getPoles = () => {
    const getType = cellId => pack.cells.state[cellId];
    const poles = getPolesOfInaccessibility(pack, getType);

    pack.states.forEach(s => {
      if (!s.i || s.removed) return;
      s.pole = poles[s.i] || [0, 0];
    });
  };

  // 将所有城镇和国家的文化重置为其所在单元格或中心单元格的文化（分别对应）
  const updateCultures = () => {
    TIME && console.time("更新城镇和国家的文化");

    // 为城镇分配其所在单元格的文化
    pack.burgs = pack.burgs.map((burg, index) => {
      if (index === 0) return burg;
      return {...burg, culture: pack.cells.culture[burg.cell]};
    });

    // 为国家分配其中心单元格的文化
    pack.states = pack.states.map((state, index) => {
      if (index === 0) return state;
      return {...state, culture: pack.cells.culture[state.center]};
    });

    TIME && console.timeEnd("更新城镇和国家的文化");
  };

  // 计算国家数据，如面积、人口等
  const collectStatistics = () => {
    TIME && console.time("收集统计数据");
    const {cells, states} = pack;

    states.forEach(s => {
      if (s.removed) return;
      s.cells = s.area = s.burgs = s.rural = s.urban = 0;
      s.neighbors = new Set();
    });

    for (const i of cells.i) {
      if (cells.h[i] < 20) continue;
      const s = cells.state[i];

      // 检查邻国
      cells.c[i]
        .filter(c => cells.h[c] >= 20 && cells.state[c] !== s)
        .forEach(c => states[s].neighbors.add(cells.state[c]));

      // 收集统计数据
      states[s].cells += 1;
      states[s].area += cells.area[i];
      states[s].rural += cells.pop[i];
      if (cells.burg[i]) {
        states[s].urban += pack.burgs[cells.burg[i]].population;
        states[s].burgs++;
      }
    }

    // 将邻国集合转换为数组
    states.forEach(s => {
      if (!s.neighbors) return;
      s.neighbors = Array.from(s.neighbors);
    });

    TIME && console.timeEnd("收集统计数据");
  };

  const assignColors = () => {
    TIME && console.time("分配颜色");
    const colors = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f"]; // d3.schemeSet2;

    // 使用贪心着色算法分配基础颜色
    pack.states.forEach(s => {
      if (!s.i || s.removed || s.lock) return;
      const neibs = s.neighbors;
      s.color = colors.find(c => neibs.every(n => pack.states[n].color !== c));
      if (!s.color) s.color = getRandomColor();
      colors.push(colors.shift());
    });

    // 对每个已使用的颜色进行轻微随机化
    colors.forEach(c => {
      const sameColored = pack.states.filter(s => s.color === c && !s.lock);
      sameColored.forEach((s, d) => {
        if (!d) return;
        s.color = getMixedColor(s.color);
      });
    });

    TIME && console.timeEnd("分配颜色");
  };

  const wars = {
    War: 6,
    Conflict: 2,
    Campaign: 4,
    Invasion: 2,
    Rebellion: 2,
    Conquest: 2,
    Intervention: 1,
    Expedition: 1,
    Crusade: 1
  };

  const generateCampaign = state => {
    const neighbors = state.neighbors.length ? state.neighbors : [0];
    return neighbors
      .map(i => {
        const name = i && P(0.8) ? pack.states[i].name : Names.getCultureShort(state.culture);
        const start = gauss(options.year - 100, 150, 1, options.year - 6);
        const end = start + gauss(4, 5, 1, options.year - start - 1);
        return {name: getAdjective(name) + rw(wars), start, end};
      })
      .sort((a, b) => a.start - b.start);
  };

  // 生成每个国家的历史冲突
  const generateCampaigns = () => {
    pack.states.forEach(s => {
      if (!s.i || s.removed) return;
      s.campaigns = generateCampaign(s);
    });
  };

  // 生成外交关系
  const generateDiplomacy = () => {
    TIME && console.time("生成外交关系");
    const {cells, states} = pack;
    const chronicle = (states[0].diplomacy = []);
    const valid = states.filter(s => s.i && !states.removed);

    const neibs = {盟友: 1, Friendly: 2, Neutral: 1, Suspicion: 10, 竞争对手: 9}; // 与邻国的关系
    const neibsOfNeibs = {盟友: 10, Friendly: 8, Neutral: 5, Suspicion: 1}; // 与邻国的邻国的关系
    const far = {Friendly: 1, Neutral: 12, Suspicion: 2, Unknown: 6}; // 与其他国家的关系
    const navals = {Neutral: 1, Suspicion: 2, 竞争对手: 1, Unknown: 1}; // 海军强国之间的关系

    valid.forEach(s => (s.diplomacy = new Array(states.length).fill("x"))); // 清除所有关系
    if (valid.length < 2) return; // 没有足够的国家生成关系
    const areaMean = d3.mean(valid.map(s => s.area)); // 国家平均面积

    // 通用关系
    for (let f = 1; f < states.length; f++) {
      if (states[f].removed) continue;

      if (states[f].diplomacy.includes("附庸")) {
        // 附庸国复制宗主国的关系
        const suzerain = states[f].diplomacy.indexOf("附庸");

        for (let i = 1; i < states.length; i++) {
          if (i === f || i === suzerain) continue;
          states[f].diplomacy[i] = states[suzerain].diplomacy[i];
          if (states[suzerain].diplomacy[i] === "宗主") states[f].diplomacy[i] = "盟友";
          for (let e = 1; e < states.length; e++) {
            if (e === f || e === suzerain) continue;
            if (states[e].diplomacy[suzerain] === "宗主" || states[e].diplomacy[suzerain] === "附庸") continue;
            states[e].diplomacy[f] = states[e].diplomacy[suzerain];
          }
        }
        continue;
      }

      for (let t = f + 1; t < states.length; t++) {
        if (states[t].removed) continue;

        if (states[t].diplomacy.includes("附庸")) {
          const suzerain = states[t].diplomacy.indexOf("附庸");
          states[f].diplomacy[t] = states[f].diplomacy[suzerain];
          continue;
        }

        const naval =
          states[f].type === "Naval" &&
          states[t].type === "Naval" &&
          cells.f[states[f].center] !== cells.f[states[t].center];
        const neib = naval ? false : states[f].neighbors.includes(t);
        const neibOfNeib =
          naval || neib
            ? false
            : states[f].neighbors
                .map(n => states[n].neighbors)
                .join("")
                .includes(t);

        let status = naval ? rw(navals) : neib ? rw(neibs) : neibOfNeib ? rw(neibsOfNeibs) : rw(far);

        // 添加附庸关系
        if (
          neib &&
          P(0.8) &&
          states[f].area > areaMean &&
          states[t].area < areaMean &&
          states[f].area / states[t].area > 2
        )
          status = "附庸";
        states[f].diplomacy[t] = status === "附庸" ? "宗主" : status;
        states[t].diplomacy[f] = status;
      }
    }

    // 宣战
    for (let attacker = 1; attacker < states.length; attacker++) {
      const ad = states[attacker].diplomacy; // 进攻方的关系;
      if (states[attacker].removed) continue;
      if (!ad.includes("竞争对手")) continue; // 没有可攻击的竞争对手
      if (ad.includes("附庸")) continue; // 不是独立国家
      if (ad.includes("敌对")) continue; // 已处于战争状态

      // 随机选择一个独立的竞争对手
      const defender = ra(
        ad.map((r, d) => (r === "竞争对手" && !states[d].diplomacy.includes("附庸") ? d : 0)).filter(d => d)
      );
      let ap = states[attacker].area * states[attacker].expansionism;
      let dp = states[defender].area * states[defender].expansionism;
      if (ap < dp * gauss(1.6, 0.8, 0, 10, 2)) continue; // 防守方太强

      const an = states[attacker].name;
      const dn = states[defender].name; // 名称
      const attackers = [attacker];
      const defenders = [defender]; // 进攻方和防守方数组
      const dd = states[defender].diplomacy; // 防守方的关系;

      // 发起一场正在进行的战争
      const name = `${an}-${trimVowels(dn)}ian War`;
      const start = options.year - gauss(2, 3, 0, 10);
      const war = [name, `${an} 向其竞争对手 ${dn} 宣战`];
      const campaign = {name, start, attacker, defender};
      states[attacker].campaigns.push(campaign);
      states[defender].campaigns.push(campaign);

      // 进攻方的附庸加入战争
      ad.forEach((r, d) => {
        if (r === "宗主") {
          attackers.push(d);
          war.push(`${an}的附庸 ${states[d].name} 加入进攻方参战`);
        }
      });

      // 防守方的附庸加入战争
      dd.forEach((r, d) => {
        if (r === "宗主") {
          defenders.push(d);
          war.push(`${dn}的附庸 ${states[d].name} 加入防守方参战`);
        }
      });

      ap = d3.sum(attackers.map(a => states[a].area * states[a].expansionism)); // 进攻方联军实力
      dp = d3.sum(defenders.map(d => states[d].area * states[d].expansionism)); // 防守方联军实力

      // 防守方的盟友加入
      dd.forEach((r, d) => {
        if (r !== "盟友" || states[d].diplomacy.includes("附庸")) return;
        if (states[d].diplomacy[attacker] !== "竞争对手" && ap / dp > 2 * gauss(1.6, 0.8, 0, 10, 2)) {
          const reason = states[d].diplomacy.includes("敌对") ? "因已处于战争中，" : `因惧怕 ${an}，`;
          war.push(`${reason} ${states[d].name} 终止了与 ${dn} 的防御同盟`);
          dd[d] = states[d].diplomacy[defender] = "Suspicion";
          return;
        }
        defenders.push(d);
        dp += states[d].area * states[d].expansionism;
        war.push(`${dn}的盟友 ${states[d].name} 加入防守方参战`);

        // 盟友的附庸加入
        states[d].diplomacy
          .map((r, d) => (r === "宗主" ? d : 0))
          .filter(d => d)
          .forEach(v => {
            defenders.push(v);
            dp += states[v].area * states[v].expansionism;
            war.push(`${states[d].name}的附庸 ${states[v].name} 加入防守方参战`);
          });
      });

      // 若防守方是进攻方盟友的竞争对手，或联军实力超过防守方且防守方不是其盟友，则进攻方的盟友加入
      ad.forEach((r, d) => {
        if (r !== "盟友" || states[d].diplomacy.includes("附庸") || defenders.includes(d)) return;
        const name = states[d].name;
        if (states[d].diplomacy[defender] !== "竞争对手" && (P(0.2) || ap <= dp * 1.2)) {
          war.push(`${an}的盟友 ${name} 避免参战`);
          return;
        }
        const allies = states[d].diplomacy.map((r, d) => (r === "盟友" ? d : 0)).filter(d => d);
        if (allies.some(ally => defenders.includes(ally))) {
          war.push(`${an}的盟友 ${name} 因盟友分属交战双方而未参战`);
          return;
        }

        attackers.push(d);
        ap += states[d].area * states[d].expansionism;
        war.push(`${an}的盟友 ${name} 加入进攻方参战`);

        // 盟友的附庸加入
        states[d].diplomacy
          .map((r, d) => (r === "宗主" ? d : 0))
          .filter(d => d)
          .forEach(v => {
            attackers.push(v);
            dp += states[v].area * states[v].expansionism;
            war.push(`${states[d].name}的附庸 ${states[v].name} 加入进攻方参战`);
          });
      });

      // 所有参战方的关系变为敌对
      attackers.forEach(a => defenders.forEach(d => (states[a].diplomacy[d] = states[d].diplomacy[a] = "敌对")));
      chronicle.push(war); // 添加到外交历史记录
    }

    TIME && console.timeEnd("生成外交关系");
  };

  // 为列出的或所有有效国家选择政体
  const defineStateForms = list => {
    TIME && console.time("定义国家政体");
    const states = pack.states.filter(s => s.i && !s.removed && !s.lock);
    if (states.length < 1) return;

    const generic = {"君主制": 25, "共和制": 2, "联邦制": 1};
    const naval = {"君主制": 25, "共和制": 8, "联邦制": 3};

    const median = d3.median(pack.states.map(s => s.area));
    const empireMin = states.map(s => s.area).sort((a, b) => b - a)[Math.max(Math.ceil(states.length ** 0.4) - 2, 0)];
    const expTiers = pack.states.map(s => {
      let tier = Math.min(Math.floor((s.area / median) * 2.6), 4);
      if (tier === 4 && s.area < empireMin) tier = 3;
      return tier;
    });

    const monarchy = ["公国", "大公国", "亲王国", "王国", "帝国"]; // 按扩张等级划分
    const republic = {
      共和国: 75,
      联邦: 4,
      公司: 4,
      最尊贵共和国: 2,
      寡头政体: 2,
      四帝共治制: 1,
      三头政治: 1,
      二元共和制: 1,
      军政府: 1
    }; // 加权随机
    const union = {
      联盟: 3,
      邦联: 1,
      联合王国: 1,
      联合共和国: 1,
      联合省: 2,
      联邦: 1
    }; // 加权随机
    const theocracy = {神权国: 20, 兄弟会: 1, 教区: 1, 神圣王国: 1};
    const anarchy = {自由领地: 2, 议事会: 3, 公社: 1, 社区: 1};

    for (const s of states) {
      if (list && !list.includes(s.i)) continue;
      const tier = expTiers[s.i];

      const religion = pack.cells.religion[s.center];
      const isTheocracy =
        (religion && pack.religions[religion].expansion === "state") ||
        (P(0.1) && ["有组织的", "教派"].includes(pack.religions[religion].type));
      const isAnarchy = P(0.01 - tier / 500);

      if (isTheocracy) s.form = "神权制";
      else if (isAnarchy) s.form = "无政府状态";
      else s.form = s.type === "航海" ? rw(naval) : rw(generic);
      s.formName = selectForm(s, tier);
      s.fullName = getFullName(s);
    }

    function selectForm(s, tier) {
      const base = pack.cultures[s.culture].base;

      if (s.form === "君主制") {
        const form = monarchy[tier];
        // 默认名称取决于扩张等级，某些文化基准对等级有特殊名称
        if (s.diplomacy) {
          if (
            form === "公国" &&
            s.neighbors.length > 1 &&
            rand(6) < s.neighbors.length &&
            s.diplomacy.includes("附庸")
          )
            return "边境伯国"; // 一些边境的附庸公国
          if (base === 1 && P(0.3) && s.diplomacy.includes("附庸")) return "自治领"; // 英格兰附庸
          if (P(0.3) && s.diplomacy.includes("附庸")) return "保护国"; // 一些附庸国
        }

        if (base === 31 && (form === "帝国" || form === "王国")) return "可汗国"; // 蒙古式
        if (base === 16 && form === "亲王国") return "贝伊国"; // 突厥式
        if (base === 5 && (form === "帝国" || form === "王国")) return "沙皇国"; //  Ruthenian式
        if (base === 16 && (form === "帝国" || form === "王国")) return "汗国"; // 突厥式
        if (base === 12 && (form === "王国" || form === "大公国")) return "幕府"; // 日本式
        if ([18, 17].includes(base) && form === "帝国") return "哈里发国"; // 阿拉伯式、柏柏尔式
        if (base === 18 && (form === "大公国" || form === "公国")) return "酋长国"; // 阿拉伯式
        if (base === 7 && (form === "大公国" || form === "公国")) return "专制君主国"; // 希腊式
        if (base === 31 && (form === "大公国" || form === "公国")) return "兀鲁思"; // 蒙古式
        if (base === 16 && (form === "大公国" || form === "公国")) return "部落"; // 突厥式
        if (base === 24 && (form === "大公国" || form === "公国")) return "总督辖区"; // 伊朗式
        return form;
      }

      if (s.form === "共和制") {
        // 默认名称来自加权数组，仅拥有1个城镇的小国为特殊情况
        if (tier < 2 && s.burgs === 1) {
          if (trimVowels(s.name) === trimVowels(pack.burgs[s.capital].name)) {
            s.name = pack.burgs[s.capital].name;
            return "自由市";
          }
          if (P(0.3)) return "城邦";
        }
        return rw(republic);
      }

      if (s.form === "联邦制") return rw(union);
      if (s.form === "无政府状态") return rw(anarchy);

      if (s.form === "神权制") {
        // 欧洲式
        if ([0, 1, 2, 3, 4, 6, 8, 9, 13, 15, 20].includes(base)) {
          if (P(0.1)) return "神圣" + monarchy[tier];
          if (tier < 2 && P(0.5)) return "教区";
          if (tier < 2 && P(0.5)) return "主教区";
        }
        if (P(0.9) && [7, 5].includes(base)) {
          // 希腊式、Ruthenian式
          if (tier < 2) return "督主教区";
          if (tier === 2) return "大主教区";
          if (tier > 2) return "牧首区";
        }
        if (P(0.9) && [21, 16].includes(base)) return "伊玛目国"; // 尼日利亚式、土耳其式
        if (tier > 2 && P(0.8) && [18, 17, 28].includes(base)) return "哈里发国"; // 阿拉伯式、柏柏尔式、斯瓦希里式
        return rw(theocracy);
      }
    }

    TIME && console.timeEnd("定义国家政体");
  };


  const getFullName = state => {
    if (!state.formName) return state.name;
    if (!state.name && state.formName) return state.formName;
    return `${state.name}${state.formName}`;
  };

  return {
    generate,
    expandStates,
    normalizeStates,
    getPoles,
    assignColors,
    specifyBurgs,
    defineBurgFeatures,
    getType,
    collectStatistics,
    generateCampaign,
    generateCampaigns,
    generateDiplomacy,
    defineStateForms,
    getFullName,
    updateCultures,
    getCloseToEdgePoint
  };
})();