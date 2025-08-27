"use strict";

window.Military = (function () {
  const generate = function () {
    TIME && console.time("生成军事力量");
    const {cells, states} = pack;
    const {p} = cells;
    const valid = states.filter(s => s.i && !s.removed); // 有效国家
    if (!options.military) options.military = getDefaultOptions();

    const expn = d3.sum(valid.map(s => s.expansionism)); // 总扩张值
    const area = d3.sum(valid.map(s => s.area)); // 总面积
    const rate = {
      x: 0,
      盟友: -0.2,
      友好: -0.1,
      中立: 0,
      怀疑: 0.1,
      敌对: 1,
      互不往来: 0,
      竞争对手: 0.5,
      附庸: 0.5,
      宗主: -0.5
    };

    const stateModifier = {
      melee: {游牧: 0.5, 高原: 1.2, 湖泊: 1, 航海: 0.7, 狩猎: 1.2, 河流: 1.1},
      ranged: {游牧: 0.9, 高原: 1.3, 湖泊: 1, 航海: 0.8, 狩猎: 2, 河流: 0.8},
      mounted: {游牧: 2.3, 高原: 0.6, 湖泊: 0.7, 航海: 0.3, 狩猎: 0.7, 河流: 0.8},
      machinery: {游牧: 0.8, 高原: 1.4, 湖泊: 1.1, 航海: 1.4, 狩猎: 0.4, 河流: 1.1},
      naval: {游牧: 0.5, 高原: 0.5, 湖泊: 1.2, 航海: 1.8, 狩猎: 0.7, 河流: 1.2},
      armored: {游牧: 1, 高原: 0.5, 湖泊: 1, 航海: 1, 狩猎: 0.7, 河流: 1.1},
      aviation: {游牧: 0.5, 高原: 0.5, 湖泊: 1.2, 航海: 1.2, 狩猎: 0.6, 河流: 1.2},
      magical: {游牧: 1, 高原: 2, 湖泊: 1, 航海: 1, 狩猎: 1, 河流: 1}
    };

    const cellTypeModifier = {
      nomadic: {
        melee: 0.2,
        ranged: 0.5,
        mounted: 3,
        machinery: 0.4,
        naval: 0.3,
        armored: 1.6,
        aviation: 1,
        magical: 0.5
      },
      wetland: {
        melee: 0.8,
        ranged: 2,
        mounted: 0.3,
        machinery: 1.2,
        naval: 1.0,
        armored: 0.2,
        aviation: 0.5,
        magical: 0.5
      },
      highland: {
        melee: 1.2,
        ranged: 1.6,
        mounted: 0.3,
        machinery: 3,
        naval: 1.0,
        armored: 0.8,
        aviation: 0.3,
        magical: 2
      }
    };

    const burgTypeModifier = {
      nomadic: {
        melee: 0.3,
        ranged: 0.8,
        mounted: 3,
        machinery: 0.4,
        naval: 1.0,
        armored: 1.6,
        aviation: 1,
        magical: 0.5
      },
      wetland: {
        melee: 1,
        ranged: 1.6,
        mounted: 0.2,
        machinery: 1.2,
        naval: 1.0,
        armored: 0.2,
        aviation: 0.5,
        magical: 0.5
      },
      highland: {melee: 1.2, ranged: 2, mounted: 0.3, machinery: 3, naval: 1.0, armored: 0.8, aviation: 0.3, magical: 2}
    };

    valid.forEach(s => {
      s.temp = {};
      const d = s.diplomacy;

      const expansionRate = minmax(s.expansionism / expn / (s.area / area), 0.25, 4); // 国家扩张的实现程度
      const diplomacyRate = d.some(d => d === "敌对")
        ? 1
        : d.some(d => d === "竞争对手")
        ? 0.8
        : d.some(d => d === "怀疑")
        ? 0.5
        : 0.1; // 和平程度
      const neighborsRateRaw = s.neighbors
        .map(n => (n ? pack.states[n].diplomacy[s.i] : "怀疑"))
        .reduce((s, r) => (s += rate[r]), 0.5);
      const neighborsRate = minmax(neighborsRateRaw, 0.3, 3); // 邻国影响系数
      s.alert = minmax(rn(expansionRate * diplomacyRate * neighborsRate, 2), 0.1, 5); // 警戒系数（区域修正值）
      s.temp.platoons = [];

      // 根据国家特征应用部队类型的整体国家修正
      for (const unit of options.military) {
        if (!stateModifier[unit.type]) continue;
        let modifier = stateModifier[unit.type][s.type] || 1;
        if (unit.type === "mounted" && s.formName.includes("部落")) modifier *= 2;
        else if (unit.type === "naval" && s.form === "共和制") modifier *= 1.2;
        s.temp[unit.name] = modifier * s.alert;
      }
    });

    const getType = cell => {
      if ([1, 2, 3, 4].includes(cells.biome[cell])) return "nomadic";
      if ([7, 8, 9, 12].includes(cells.biome[cell])) return "wetland";
      if (cells.h[cell] >= 70) return "highland";
      return "generic";
    };

    function passUnitLimits(unit, biome, state, culture, religion) {
      if (unit.biomes && !unit.biomes.includes(biome)) return false;
      if (unit.states && !unit.states.includes(state)) return false;
      if (unit.cultures && !unit.cultures.includes(culture)) return false;
      if (unit.religions && !unit.religions.includes(religion)) return false;
      return true;
    }

    // 乡村区域
    for (const i of cells.i) {
      if (!cells.pop[i]) continue;

      const biome = cells.biome[i];
      const state = cells.state[i];
      const culture = cells.culture[i];
      const religion = cells.religion[i];

      const stateObj = states[state];
      if (!state || stateObj.removed) continue;

      let modifier = cells.pop[i] / 100; // 基础乡村军队比例
      if (culture !== stateObj.culture) modifier = stateObj.form === "联盟制" ? modifier / 1.2 : modifier / 2; // 非主导文化
      if (religion !== cells.religion[stateObj.center])
        modifier = stateObj.form === "神权制" ? modifier / 2.2 : modifier / 1.4; // 非主导宗教
      if (cells.f[i] !== cells.f[stateObj.center])
        modifier = stateObj.type === "航海" ? modifier / 1.2 : modifier / 1.8; // 不同陆块
      const type = getType(i);

      for (const unit of options.military) {
        const perc = +unit.rural;
        if (isNaN(perc) || perc <= 0 || !stateObj.temp[unit.name]) continue;
        if (!passUnitLimits(unit, biome, state, culture, religion)) continue;
        if (unit.type === "naval" && !cells.haven[i]) continue; // 仅近海区域可组建海军单位

        const cellTypeMod = type === "generic" ? 1 : cellTypeModifier[type][unit.type]; // 区域特定修正
        const army = modifier * perc * cellTypeMod; // 乡村区域军队数量
        const total = rn(army * stateObj.temp[unit.name] * populationRate); // 总兵力
        if (!total) continue;

        let [x, y] = p[i];
        let n = 0;

        // 海军单位部署至海上
        if (unit.type === "naval") {
          const haven = cells.haven[i];
          [x, y] = p[haven];
          n = 1;
        }

        stateObj.temp.platoons.push({
          cell: i,
          a: total,
          t: total,
          x,
          y,
          u: unit.name,
          n,
          s: unit.separate,
          type: unit.type
        });
      }
    }

    // 城镇
    for (const b of pack.burgs) {
      if (!b.i || b.removed || !b.state || !b.population) continue;

      const biome = cells.biome[b.cell];
      const state = b.state;
      const culture = b.culture;
      const religion = cells.religion[b.cell];

      const stateObj = states[state];
      let m = (b.population * urbanization) / 100; // 基础城市军队比例
      if (b.capital) m *= 1.2; // 首都有皇家卫队
      if (culture !== stateObj.culture) m = stateObj.form === "联盟制" ? m / 1.2 : m / 2; // 非主导文化
      if (religion !== cells.religion[stateObj.center]) m = stateObj.form === "神权制" ? m / 2.2 : m / 1.4; // 非主导宗教
      if (cells.f[b.cell] !== cells.f[stateObj.center]) m = stateObj.type === "航海" ? m / 1.2 : m / 1.8; // 不同陆块
      const type = getType(b.cell);

      for (const unit of options.military) {
        const perc = +unit.urban;
        if (isNaN(perc) || perc <= 0 || !stateObj.temp[unit.name]) continue;
        if (!passUnitLimits(unit, biome, state, culture, religion)) continue;
        if (unit.type === "naval" && (!b.port || !cells.haven[b.cell])) continue; // 仅港口可组建海军单位

        const mod = type === "generic" ? 1 : burgTypeModifier[type][unit.type]; // 区域特定修正
        const army = m * perc * mod; // 城市区域军队数量
        const total = rn(army * stateObj.temp[unit.name] * populationRate); // 总兵力
        if (!total) continue;

        let [x, y] = p[b.cell];
        let n = 0;

        // 海军部署至海上
        if (unit.type === "naval") {
          const haven = cells.haven[b.cell];
          [x, y] = p[haven];
          n = 1;
        }

        stateObj.temp.platoons.push({
          cell: b.cell,
          a: total,
          t: total,
          x,
          y,
          u: unit.name,
          n,
          s: unit.separate,
          type: unit.type
        });
      }
    }

    const expected = 3 * populationRate; // 预期团级规模
    const mergeable = (n0, n1) => (!n0.s && !n1.s) || n0.u === n1.u; // 检查军团是否可合并

    // 为每个国家组建军团
    valid.forEach(s => {
      s.military = createRegiments(s.temp.platoons, s);
      delete s.temp; // 不存储临时数据
    });

    function createRegiments(nodes, s) {
      if (!nodes.length) return [];

      nodes.sort((a, b) => a.a - b.a); // 在兵力最多的区域组建军团
      const tree = d3.quadtree(
        nodes,
        d => d.x,
        d => d.y
      );

      nodes.forEach(node => {
        tree.remove(node);
        const overlap = tree.find(node.x, node.y, 20);
        if (overlap && overlap.t && mergeable(node, overlap)) {
          merge(node, overlap);
          return;
        }
        if (node.t > expected) return;
        const r = (expected - node.t) / (node.s ? 40 : 20); // 搜索半径
        const candidates = tree.findAll(node.x, node.y, r);
        for (const c of candidates) {
          if (c.t < expected && mergeable(node, c)) {
            merge(node, c);
            break;
          }
        }
      });

      // 将n0合并至n1的最终上级
      function merge(n0, n1) {
        if (!n1.childen) n1.childen = [n0];
        else n1.childen.push(n0);
        if (n0.childen) n0.childen.forEach(n => n1.childen.push(n));
        n1.t += n0.t;
        n0.t = 0;
      }

      // 解析军团数据
      const regiments = nodes
        .filter(n => n.t)
        .sort((a, b) => b.t - a.t)
        .map((r, i) => {
          const u = {};
          u[r.u] = r.a;
          (r.childen || []).forEach(n => (u[n.u] = u[n.u] ? (u[n.u] += n.a) : n.a));
          return {i, a: r.t, cell: r.cell, x: r.x, y: r.y, bx: r.x, by: r.y, u, n: r.n, name, state: s.i};
        });

      // 为军团生成名称
      regiments.forEach(r => {
        r.name = getName(r, regiments);
        r.icon = getEmblem(r);
        generateNote(r, s);
      });

      return regiments;
    }

    TIME && console.timeEnd("生成军事力量");
  };

  const getDefaultOptions = function () {
    return [
      {icon: "⚔️", name: "步兵", rural: 0.25, urban: 0.2, crew: 1, power: 1, type: "melee", separate: 0},
      {icon: "🏹", name: "弓箭手", rural: 0.12, urban: 0.2, crew: 1, power: 1, type: "ranged", separate: 0},
      {icon: "🐴", name: "骑兵", rural: 0.12, urban: 0.03, crew: 2, power: 2, type: "mounted", separate: 0},
      {icon: "💣", name: "炮兵", rural: 0, urban: 0.03, crew: 8, power: 12, type: "machinery", separate: 0},
      {icon: "🌊", name: "舰队", rural: 0, urban: 0.015, crew: 100, power: 50, type: "naval", separate: 1}
    ];
  };

  // 利用si函数使军团总兵力文本适配军团框
  const getTotal = reg => (reg.a > (reg.n ? 999 : 99999) ? si(reg.a) : reg.a);

  const getName = function (r, regiments) {
    const cells = pack.cells;
    const proper = r.n
      ? null
      : cells.province[r.cell] && pack.provinces[cells.province[r.cell]]
      ? pack.provinces[cells.province[r.cell]].name
      : cells.burg[r.cell] && pack.burgs[cells.burg[r.cell]]
      ? pack.burgs[cells.burg[r.cell]].name
      : null;
    const number = nth(regiments.filter(reg => reg.n === r.n && reg.i < r.i).length + 1);
    const form = r.n ? "舰队" : "军团";
    return `${number}${proper ? `（${proper}）` : ""}${form}`;
  };

  // 获取默认军团徽章
  const getEmblem = function (r) {
    if (!r.n && !Object.values(r.u).length) return "🔰"; // 无兵力的"新兵"军团
    if (
      !r.n &&
      pack.states[r.state].form === "君主制" &&
      pack.cells.burg[r.cell] &&
      pack.burgs[pack.cells.burg[r.cell]].capital
    )
      return "👑"; // 驻首都的"皇家"军团
    const mainUnit = Object.entries(r.u).sort((a, b) => b[1] - a[1])[0][0]; // 军团中兵力最多的单位
    const unit = options.military.find(u => u.name === mainUnit);
    return unit.icon;
  };

  const generateNote = function (r, s) {
    const cells = pack.cells;
    const base =
      cells.burg[r.cell] && pack.burgs[cells.burg[r.cell]]
        ? pack.burgs[cells.burg[r.cell]].name
        : cells.province[r.cell] && pack.provinces[cells.province[r.cell]]
        ? pack.provinces[cells.province[r.cell]].fullName
        : null;
    const station = base ? `${r.name}${r.n ? "以" : "驻"}${base}为基地。` : "";

    const composition = r.a
      ? Object.keys(r.u)
          .map(t => `— ${t}：${r.u[t]}`)
          .join("\r\n")
      : null;
    const troops = composition
      ? `\r\n\r\n${options.year}${options.eraShort}年军团编制：\r\n${composition}。`
      : "";

    const campaign = s.campaigns ? ra(s.campaigns) : null;
    const year = campaign
      ? rand(campaign.start, campaign.end || options.year)
      : gauss(options.year - 100, 150, 1, options.year - 6);
    const conflict = campaign ? `，正值${campaign.name}期间` : "";
    const legend = `军团组建于 ${year} 年 ${options.era}${conflict}. ${station}${troops}`;
    notes.push({id: `regiment${s.i}-${r.i}`, name: r.name, legend});
  };

  return {
    generate,
    getDefaultOptions,
    getName,
    generateNote,
    getTotal,
    getEmblem
  };
})();