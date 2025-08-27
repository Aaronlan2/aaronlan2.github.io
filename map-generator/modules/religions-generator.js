"use strict";

window.Religions = (function () {
  // name generation approach and relative chance to be selected
  const approach = {
    数字: 1,
    存在: 3,
    形容词: 5,
    "颜色 + 动物": 5,
    "形容词 + 动物": 5,
    "形容词 + 存在": 5,
    "形容词 + 所有格": 1,
    "颜色 + 存在": 3,
    "颜色 + 所有格": 3,
    "所有者 + 存在": 2,
    "所有格 + 动物": 1,
    "所有者 + 形容词 + 存在": 2,
    "所有者 + 形容词 + 动物": 2
  };
  
  // turn weighted array into simple array
  const approaches = [];
  for (const a in approach) {
    for (let j = 0; j < approach[a]; j++) {
      approaches.push(a);
    }
  }

  const base = {
    number: ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"],
    being: [
      "先祖",
      "远古者",
      "化身",
      "兄弟",
      "勇士",
      "首领",
      "造物主",
      "神祇",
      "神圣者",
      "长老",
      "觉悟者",
      "父亲",
      "前辈",
      "始祖",
      "给予者",
      "神",
      "女神",
      "守护者",
      "向导",
      "教主",
      "女士",
      "领主",
      "创造者",
      "主人",
      "母亲",
      "灵体",
      "神谕者",
      "霸主",
      "保护者",
      "收割者",
      "统治者",
      "智者",
      "先知",
      "姐妹",
      "灵魂",
      "至高存在",
      "超越者",
      "圣女"
    ],
    animal: [
      "羚羊",
      "猿猴",
      "獾",
      " basilisk（蛇怪）",
      "熊",
      "海狸",
      "野牛",
      "野猪",
      "水牛",
      "骆驼",
      "猫",
      "半人马",
      "刻耳柏洛斯（三头犬）",
      "奇美拉（狮首羊身蛇尾兽）",
      "眼镜蛇",
      "鸡蛇",
      "鹤",
      "鳄鱼",
      "乌鸦",
      "独眼巨人",
      "鹿",
      "狗",
      "恐狼",
      "小龙",
      "龙",
      "鹰",
      "大象",
      "麋鹿",
      "隼",
      "狐狸",
      "山羊",
      "鹅",
      "戈耳工（蛇发女妖）",
      "狮鹫",
      "野兔",
      "鹰",
      "苍鹭",
      "马身鹰首兽",
      "马",
      "猎犬",
      "鬣狗",
      "朱鹭",
      "胡狼",
      "美洲豹",
      "狐妖",
      "克拉肯（海怪）",
      "云雀",
      "豹",
      "狮子",
      "曼提柯尔（狮身蝎尾兽）",
      "螳螂",
      "貂",
      "弥诺陶洛斯（牛头人）",
      "驼鹿",
      "骡子",
      "独角鲸",
      "猫头鹰",
      "牛",
      "黑豹",
      "飞马",
      "凤凰",
      "蟒蛇",
      "老鼠",
      "渡鸦",
      "大鹏",
      "白嘴鸦",
      "蝎子",
      "巨蛇",
      "鲨鱼",
      "绵羊",
      "蛇",
      "斯芬克斯（狮身人面像）",
      "蜘蛛",
      "天鹅",
      "老虎",
      "海龟",
      "独角兽",
      "蝰蛇",
      "秃鹫",
      "海象",
      "狼",
      "狼獾",
      "蠕虫",
      "双足飞龙",
      "雪人"
    ],
    adjective: [
      "好斗的",
      "全能的",
      "古老的",
      "美丽的",
      "仁慈的",
      "巨大的",
      "盲目的",
      "金发的",
      "血腥的",
      "勇敢的",
      "破碎的",
      "残忍的",
      "燃烧的",
      "平静的",
      "天界的",
      "愉悦的",
      "疯狂的",
      "残酷的",
      "死亡的",
      "致命的",
      "毁灭性的",
      "遥远的",
      "令人不安的",
      "神圣的",
      "垂死的",
      "永恒的",
      "以太的",
      "九天的",
      "神秘的",
      "觉悟的",
      "邪恶的",
      "明确的",
      "公正的",
      "遥远的",
      "肥胖的",
      "致命的",
      "有利的",
      "飞翔的",
      "友好的",
      "冰封的",
      "巨型的",
      "善良的",
      "感恩的",
      "伟大的",
      "快乐的",
      "崇高的",
      "神圣的",
      "诚实的",
      "庞大的",
      "饥饿的",
      "杰出的",
      "永恒不变的",
      "妙不可言的",
      "无误的",
      "固有的",
      "最后的",
      "后者的",
      "迷失的",
      "喧闹的",
      "幸运的",
      "疯狂的",
      "魔法的",
      "主要的",
      "重大的",
      "海洋的",
      "神话的",
      "神秘的",
      "航海的",
      "新的",
      "高贵的",
      "古老的",
      "超自然的",
      "耐心的",
      "和平的",
      "怀孕的",
      "首要的",
      "骄傲的",
      "纯洁的",
      "光辉的",
      "华丽的",
      "神圣的",
      "至圣的",
      "悲伤的",
      "可怕的",
      "秘密的",
      "被选中的",
      "宁静的",
      "严厉的",
      "沉默的",
      "沉睡的",
      "安睡的",
      "至高无上的",
      "强大的",
      "晴朗的",
      "优越的",
      "超自然的",
      "可持续的",
      "超越的",
      "先验的",
      "陷入困境的",
      "非尘世的",
      "深不可测的",
      "不快乐的",
      "未知的",
      "看不见的",
      "苏醒的",
      "野生的",
      "智慧的",
      "担忧的",
      "年轻的"
    ],
    genitive: [
      "寒冷",
      "白昼",
      "死亡",
      "末日",
      "命运",
      "火焰",
      "迷雾",
      "寒霜",
      "大门",
      "天堂",
      "家园",
      "冰雪",
      "正义",
      "生命",
      "光明",
      "闪电",
      "爱情",
      "自然",
      "黑夜",
      "痛苦",
      "雪花",
      "泉水",
      "夏日",
      "雷霆",
      "时间",
      "胜利",
      "战争",
      "冬季"
    ],
    theGenitive: [
      "深渊",
      "血液",
      "黎明",
      "大地",
      "东方",
      "日食",
      "坠落",
      "丰收",
      "月亮",
      "北方",
      "山峰",
      "彩虹",
      "海洋",
      "天空",
      "南方",
      "星辰",
      "风暴",
      "太阳",
      "树木",
      "冥界",
      "西方",
      "荒野",
      "圣言",
      "世界"
    ],
    color: [
      "琥珀色",
      "黑色",
      "蓝色",
      "明亮色",
      "青铜色",
      "棕色",
      "珊瑚色",
      "深红色",
      "深色",
      "祖母绿色",
      "金色",
      "绿色",
      "灰色",
      "靛蓝色",
      "淡紫色",
      "浅色",
      "品红色",
      "褐红色",
      "橙色",
      "粉色",
      "李子色",
      "紫色",
      "红色",
      "红宝石色",
      "蓝宝石色",
      "蓝绿色",
      "青绿色",
      "白色",
      "黄色"
    ]
  };

  const forms = {
    民间: {
      萨满教: 4,
      泛灵论: 4,
      多神论: 4,
      祖先崇拜: 2,
      自然崇拜: 1,
      图腾崇拜: 1
    },
    组织: {
      多神论: 7,
      一神论: 7,
      二元论: 3,
      泛神论: 2,
      非神论: 2
    },
    教派: {
      教派: 5,
      黑暗教派: 5,
      宗派: 1
    },
    异端: {
      异端: 1
    }
  };

  const namingMethods = {
    民间: {
      "文化 + 类型": 1
    },

    组织: {
      "随机 + 类型": 3,
      "随机 + 主义": 1,
      "至高 + 主义": 5,
      "至高者的信仰": 5,
      "地点 + 主义": 1,
      "文化 + 主义": 2,
      "地点 + 信徒 + 类型": 6,
      "文化 + 类型": 4
    },

    教派: {
      "城镇 + 信徒 + 类型": 2,
      "随机 + 信徒 + 类型": 1,
      "含义 + 类型": 2
    },

    异端: {
      "城镇 + 信徒 + 类型": 3,
      "随机 + 主义": 3,
      "随机 + 信徒 + 类型": 2,
      "含义 + 类型": 1
    }
  };

  const types = {
    萨满教: {信仰: 3, 萨满: 2, 德鲁伊教: 1, 灵体: 1},
    泛灵论: {灵体: 3, 信仰: 1},
    多神论: {神祇: 3, 信仰: 1, 诸神: 1, 万神殿: 1},
    祖先崇拜: {信仰: 1, 先祖: 2, 祖先: 2},
    自然崇拜: {信仰: 3, 德鲁伊: 1},
    图腾崇拜: {信仰: 2, 图腾: 2, 偶像: 1},

    一神论: {宗教: 2, 教会: 3, 信仰: 1},
    二元论: {宗教: 3, 信仰: 1, 教派: 1},
    泛神论: {宗教: 1, 信仰: 1},
    非神论: {信仰: 3, 灵体: 1},

    教派: {教派: 4, 宗派: 2, 奥秘: 1, 教团: 1, 崇拜: 1},
    黑暗教派: {教派: 2, 亵渎: 1, 密会: 1, 女巫集会: 1, 偶像: 1, 神秘学: 1},
    宗派: {宗派: 3, 社团: 1},

    异端: {
      异端: 3,
      宗派: 2,
      叛教者: 1,
      兄弟会: 1,
      密会: 1,
      异议: 1,
      持异议者: 1,
      圣像破坏: 1,
      分裂: 1,
      社团: 1
    }
  };

  const expansionismMap = {
    民间: () => 0,
    组织: () => gauss(5, 3, 0, 10, 1),
    教派: () => gauss(0.5, 0.5, 0, 5, 1),
    异端: () => gauss(1, 0.5, 0, 5, 1)
  };

  function generate() {
    TIME && console.time("生成宗教");
    const lockedReligions = pack.religions?.filter(r => r.i && r.lock && !r.removed) || [];

    const folkReligions = generateFolkReligions();
    const organizedReligions = generateOrganizedReligions(+religionsNumber.value, lockedReligions);

    const namedReligions = specifyReligions([...folkReligions, ...organizedReligions]);
    const indexedReligions = combineReligions(namedReligions, lockedReligions);
    const religionIds = expandReligions(indexedReligions);
    const religions = defineOrigins(religionIds, indexedReligions);

    pack.religions = religions;
    pack.cells.religion = religionIds;

    checkCenters();

    TIME && console.timeEnd("生成宗教");
  }

  function generateFolkReligions() {
    return pack.cultures
      .filter(c => c.i && !c.removed)
      .map(culture => ({type: "民间", form: rw(forms.民间), culture: culture.i, center: culture.center}));
  }

  function generateOrganizedReligions(desiredReligionNumber, lockedReligions) {
    const cells = pack.cells;
    const lockedReligionCount = lockedReligions.filter(({type}) => type !== "民间").length || 0;
    const requiredReligionsNumber = desiredReligionNumber - lockedReligionCount;
    if (requiredReligionsNumber < 1) return [];

    const candidateCells = getCandidateCells();
    const religionCores = placeReligions();

    const cultsCount = Math.floor((rand(1, 4) / 10) * religionCores.length); // 10-40%
    const heresiesCount = Math.floor((rand(0, 3) / 10) * religionCores.length); // 0-30%
    const organizedCount = religionCores.length - cultsCount - heresiesCount;

    const getType = index => {
      if (index < organizedCount) return "组织";
      if (index < organizedCount + cultsCount) return "教派";
      return "异端";
    };

    return religionCores.map((cellId, index) => {
      const type = getType(index);
      const form = rw(forms[type]);
      const cultureId = cells.culture[cellId];

      return {type, form, culture: cultureId, center: cellId};
    });

    function placeReligions() {
      const religionCells = [];
      const religionsTree = d3.quadtree();

      // pre-populate with locked centers
      lockedReligions.forEach(({center}) => religionsTree.add(cells.p[center]));

      // min distance between religion inceptions
      const spacing = (graphWidth + graphHeight) / 2 / desiredReligionNumber;

      for (const cellId of candidateCells) {
        const [x, y] = cells.p[cellId];

        if (religionsTree.find(x, y, spacing) === undefined) {
          religionCells.push(cellId);
          religionsTree.add([x, y]);

          if (religionCells.length === requiredReligionsNumber) return religionCells;
        }
      }

      WARN && console.warn(`仅放置了${religionCells.length}个宗教，目标为${requiredReligionsNumber}个`);
      return religionCells;
    }

    function getCandidateCells() {
      const validBurgs = pack.burgs.filter(b => b.i && !b.removed);

      if (validBurgs.length >= requiredReligionsNumber)
        return validBurgs.sort((a, b) => b.population - a.population).map(burg => burg.cell);
      return cells.i.filter(i => cells.s[i] > 2).sort((a, b) => cells.s[b] - cells.s[a]);
    }
  }

  function specifyReligions(newReligions) {
    const {cells, cultures} = pack;

    const rawReligions = newReligions.map(({type, form, culture: cultureId, center}) => {
      const supreme = getDeityName(cultureId);
      const deity = form === "非神论" || form === "泛灵论" ? null : supreme;

      const stateId = cells.state[center];

      let [name, expansion] = generateReligionName(type, form, supreme, center);
      if (expansion === "state" && !stateId) expansion = "global";

      const expansionism = expansionismMap[type]();
      const color = getReligionColor(cultures[cultureId], type);

      return {name, type, form, culture: cultureId, center, deity, expansion, expansionism, color};
    });

    return rawReligions;

    function getReligionColor(culture, type) {
      if (!culture.i) return getRandomColor();

      if (type === "民间") return culture.color;
      if (type === "异端") return getMixedColor(culture.color, 0.35, 0.2);
      if (type === "教派") return getMixedColor(culture.color, 0.5, 0);
      return getMixedColor(culture.color, 0.25, 0.4);
    }
  }

  // indexes, conditionally renames, and abbreviates religions
  function combineReligions(namedReligions, lockedReligions) {
    const indexedReligions = [{name: "无宗教", i: 0}];

    const {lockedReligionQueue, highestLockedIndex, codes, numberLockedFolk} = parseLockedReligions();
    const maxIndex = Math.max(
      highestLockedIndex,
      namedReligions.length + lockedReligions.length + 1 - numberLockedFolk
    );

    for (let index = 1, progress = 0; index < maxIndex; index = indexedReligions.length) {
      // place locked religion back at its old index
      if (index === lockedReligionQueue[0]?.i) {
        const nextReligion = lockedReligionQueue.shift();
        indexedReligions.push(nextReligion);
        continue;
      }

      // slot the new religions
      if (progress < namedReligions.length) {
        const nextReligion = namedReligions[progress];
        progress++;

        if (
          nextReligion.type === "民间" &&
          lockedReligions.some(({type, culture}) => type === "民间" && culture === nextReligion.culture)
        )
          continue; // 当该文化已有锁定的民间宗教时，丢弃重复项

        const newName = renameOld(nextReligion);
        const code = abbreviate(newName, codes);
        codes.push(code);
        indexedReligions.push({...nextReligion, i: index, name: newName, code});
        continue;
      }

      indexedReligions.push({i: index, type: "民间", culture: 0, name: "已移除宗教", removed: true});
    }
    return indexedReligions;

    function parseLockedReligions() {
      // copy and sort the locked religions list
      const lockedReligionQueue = lockedReligions
        .map(religion => {
          // 并将其起源过滤为锁定的宗教
          let newOrigin = religion.origins.filter(n => lockedReligions.some(({i: index}) => index === n));
          if (newOrigin.length === 0) newOrigin = [0];
          return {...religion, origins: newOrigin};
        })
        .sort((a, b) => a.i - b.i);

      const highestLockedIndex = Math.max(...lockedReligions.map(r => r.i));
      const codes = lockedReligions.length > 0 ? lockedReligions.map(r => r.code) : [];
      const numberLockedFolk = lockedReligions.filter(({type}) => type === "民间").length;

      return {lockedReligionQueue, highestLockedIndex, codes, numberLockedFolk};
    }

    // 为有组织竞争的民间宗教名称前缀"古老"
    function renameOld({name, type, culture: cultureId}) {
      if (type !== "民间") return name;

      const haveOrganized =
        namedReligions.some(
          ({type, culture, expansion}) => culture === cultureId && type === "组织" && expansion === "culture"
        ) ||
        lockedReligions.some(
          ({type, culture, expansion}) => culture === cultureId && type === "组织" && expansion === "culture"
        );
      if (haveOrganized && name.slice(0, 3) !== "古老") return `古老${name}`;
      return name;
    }
  }

  // finally generate and stores origins trees
  function defineOrigins(religionIds, indexedReligions) {
    const religionOriginsParamsMap = {
      组织: {clusterSize: 100, maxReligions: 2},
      教派: {clusterSize: 50, maxReligions: 3},
      异端: {clusterSize: 50, maxReligions: 4}
    };

    const origins = indexedReligions.map(({i, type, culture: cultureId, expansion, center}) => {
      if (i === 0) return null; // 无宗教
      if (type === "民间") return [0]; // 民间宗教仅起源于其母文化

      const folkReligion = indexedReligions.find(({culture, type}) => type === "民间" && culture === cultureId);
      const isFolkBased = folkReligion && cultureId && expansion === "culture" && each(2)(center);
      if (isFolkBased) return [folkReligion.i];

      const {clusterSize, maxReligions} = religionOriginsParamsMap[type];
      const fallbackOrigin = folkReligion?.i || 0;
      return getReligionsInRadius(pack.cells.c, center, religionIds, i, clusterSize, maxReligions, fallbackOrigin);
    });

    return indexedReligions.map((religion, index) => ({...religion, origins: origins[index]}));
  }

  function getReligionsInRadius(neighbors, center, religionIds, religionId, clusterSize, maxReligions, fallbackOrigin) {
    const foundReligions = new Set();
    const queue = [center];
    const checked = {};

    for (let size = 0; queue.length && size < clusterSize; size++) {
      const cellId = queue.shift();
      checked[cellId] = true;

      for (const neibId of neighbors[cellId]) {
        if (checked[neibId]) continue;
        checked[neibId] = true;

        const neibReligion = religionIds[neibId];
        if (neibReligion && neibReligion < religionId) foundReligions.add(neibReligion);
        if (foundReligions.size >= maxReligions) return [...foundReligions];
        queue.push(neibId);
      }
    }

    return foundReligions.size ? [...foundReligions] : [fallbackOrigin];
  }

  // growth algorithm to assign cells to religions
  function expandReligions(religions) {
    const {cells, routes} = pack;
    const religionIds = spreadFolkReligions(religions);

    const queue = new FlatQueue();
    const cost = [];

    // 限制有组织宗教的扩张成本
    const maxExpansionCost = (cells.i.length / 20) * byId("growthRate").valueAsNumber;

    religions
      .filter(r => r.i && !r.lock && r.type !== "民间" && !r.removed)
      .forEach(r => {
        religionIds[r.center] = r.i;
        queue.push({e: r.center, p: 0, r: r.i, s: cells.state[r.center]}, 0);
        cost[r.center] = 1;
      });

    const religionsMap = new Map(religions.map(r => [r.i, r]));

    while (queue.length) {
      const {e: cellId, p, r, s: state} = queue.pop();
      const {culture, expansion, expansionism} = religionsMap.get(r);

      cells.c[cellId].forEach(nextCell => {
        if (expansion === "culture" && culture !== cells.culture[nextCell]) return;
        if (expansion === "state" && state !== cells.state[nextCell]) return;
        if (religionsMap.get(religionIds[nextCell])?.lock) return;

        const cultureCost = culture !== cells.culture[nextCell] ? 10 : 0;
        const stateCost = state !== cells.state[nextCell] ? 10 : 0;
        const passageCost = getPassageCost(cellId, nextCell);

        const cellCost = cultureCost + stateCost + passageCost;
        const totalCost = p + 10 + cellCost / expansionism;
        if (totalCost > maxExpansionCost) return;

        if (!cost[nextCell] || totalCost < cost[nextCell]) {
          if (cells.culture[nextCell]) religionIds[nextCell] = r; // 为单元格分配宗教
          cost[nextCell] = totalCost;

          queue.push({e: nextCell, p: totalCost, r, s: state}, totalCost);
        }
      });
    }

    return religionIds;

    function getPassageCost(cellId, nextCellId) {
      const route = Routes.getRoute(cellId, nextCellId);
      if (isWater(cellId)) return route ? 50 : 500;

      const biomePassageCost = biomesData.cost[cells.biome[nextCellId]];

      if (route) {
        if (route.group === "roads") return 1;
        return biomePassageCost / 3; // 小径和其他路线
      }

      return biomePassageCost;
    }
  }

  // 民间宗教最初获得其文化的所有单元格，且锁定的宗教得以保留
  function spreadFolkReligions(religions) {
    const cells = pack.cells;
    const hasPrior = cells.religion && true;
    const religionIds = new Uint16Array(cells.i.length);

    const folkReligions = religions.filter(religion => religion.type === "民间" && !religion.removed);
    const cultureToReligionMap = new Map(folkReligions.map(({i, culture}) => [culture, i]));

    for (const cellId of cells.i) {
      const oldId = (hasPrior && cells.religion[cellId]) || 0;
      if (oldId && religions[oldId]?.lock && !religions[oldId]?.removed) {
        religionIds[cellId] = oldId;
        continue;
      }
      const cultureId = cells.culture[cellId];
      religionIds[cellId] = cultureToReligionMap.get(cultureId) || 0;
    }

    return religionIds;
  }

  function checkCenters() {
    const cells = pack.cells;
    pack.religions.forEach(r => {
      if (!r.i) return;
      // 若宗教中心不在扩张后的宗教区域内，则移动中心
      if (cells.religion[r.center] === r.i) return; // 在区域内
      const firstCell = cells.i.find(i => cells.religion[i] === r.i);
      const cultureHome = pack.cultures[r.culture]?.center;
      if (firstCell) r.center = firstCell; // 移动中心，否则为已灭绝宗教
      else if (r.type === "民间" && cultureHome) r.center = cultureHome; // 重置已灭绝文化的中心
    });
  }

  function recalculate() {
    const newReligionIds = expandReligions(pack.religions);
    pack.cells.religion = newReligionIds;

    checkCenters();
  }

  const add = function (center) {
    const {cells, cultures, religions} = pack;
    const religionId = cells.religion[center];
    const i = religions.length;

    const cultureId = cells.culture[center];
    const missingFolk =
      cultureId !== 0 &&
      !religions.some(({type, culture, removed}) => type === "民间" && culture === cultureId && !removed);
    const color = missingFolk ? cultures[cultureId].color : getMixedColor(religions[religionId].color, 0.3, 0);

    const type = missingFolk
      ? "民间"
      : religions[religionId].type === "组织"
      ? rw({组织: 4, 教派: 1, 异端: 2})
      : rw({组织: 5, 教派: 2});
    const form = rw(forms[type]);
    const deity =
      type === "异端"
        ? religions[religionId].deity
        : form === "非神论" || form === "泛灵论"
        ? null
        : getDeityName(cultureId);

    const [name, expansion] = generateReligionName(type, form, deity, center);

    const formName = type === "异端" ? religions[religionId].form : form;
    const code = abbreviate(
      name,
      religions.map(r => r.code)
    );
    const influences = getReligionsInRadius(cells.c, center, cells.religion, i, 25, 3, 0);
    const origins = type === "民间" ? [0] : influences;

    religions.push({
      i,
      name,
      color,
      culture: cultureId,
      type,
      form: formName,
      deity,
      expansion,
      expansionism: expansionismMap[type](),
      center,
      cells: 0,
      area: 0,
      rural: 0,
      urban: 0,
      origins,
      code
    });
    cells.religion[center] = i;
  };

  function updateCultures() {
    pack.religions = pack.religions.map((religion, index) => {
      if (index === 0) return religion;
      return {...religion, culture: pack.cells.culture[religion.center]};
    });
  }

  // 获取至高神祇名称
  const getDeityName = function (culture) {
    if (culture === undefined) {
      ERROR && console.error("请定义一个文化");
      return;
    }
    const meaning = generateMeaning();
    const cultureName = Names.getCulture(culture, null, null, "", 0.8);
    return cultureName + "，" + meaning;
  };

  function generateMeaning() {
    const a = ra(approaches); // 选择生成方式
    if (a === "数字") return ra(base.number);
    if (a === "存在") return ra(base.being);
    if (a === "形容词") return ra(base.adjective);
    if (a === "颜色 + 动物") return `${ra(base.color)}${ra(base.animal)}`;
    if (a === "形容词 + 动物") return `${ra(base.adjective)}${ra(base.animal)}`;
    if (a === "形容词 + 存在") return `${ra(base.adjective)}${ra(base.being)}`;
    if (a === "形容词 + 所有格") return `${ra(base.adjective)}${ra(base.genitive)}`;
    if (a === "颜色 + 存在") return `${ra(base.color)}${ra(base.being)}`;
    if (a === "颜色 + 所有格") return `${ra(base.color)}${ra(base.genitive)}`;
    if (a === "所有者 + 存在") return `${ra(base.genitive)}的${ra(base.being)}`;
    if (a === "所有格 + 动物") return `${ra(base.genitive)}的${ra(base.animal)}`;
    if (a === "所有者 + 形容词 + 存在")
      return `${ra(base.genitive)}的${ra(base.adjective)}${ra(base.being)}`;
    if (a === "所有者 + 形容词 + 动物")
      return `${ra(base.genitive)}的${ra(base.adjective)}${ra(base.animal)}`;

    ERROR && console.error("未知的生成方式");
  }

  function generateReligionName(variety, form, deity, center) {
    const {cells, cultures, burgs, states} = pack;

    const random = () => Names.getCulture(cells.culture[center], null, null, "", 0);
    const type = rw(types[form]);
    const supreme = deity.split(/[ ,]+/)[0];
    const culture = cultures[cells.culture[center]].name;

    const place = adj => {
      const burgId = cells.burg[center];
      const stateId = cells.state[center];

      const base = burgId ? burgs[burgId].name : states[stateId].name;
      let name = trimVowels(base.split(/[ ,]+/)[0]);
      return adj ? getAdjective(name) : name;
    };

    const m = rw(namingMethods[variety]);
    if (m === "随机 + 类型") return [random() + type, "global"];
    if (m === "随机 + 主义") return [trimVowels(random()) + "主义", "global"];
    if (m === "至高 + 主义" && deity) return [trimVowels(supreme) + "主义", "global"];
    if (m === "至高者的信仰" && deity)
      return [supreme + "的" + ra(["信仰", "道路", "途径", "圣言", "见证者"]), "global"];
    if (m === "地点 + 主义") return [place() + "主义", "state"];
    if (m === "文化 + 主义") return [trimVowels(culture) + "主义", "culture"];
    if (m === "地点 + 信徒 + 类型") return [place("adj") + type, "state"];
    if (m === "文化 + 类型") return [culture + type, "culture"];
    if (m === "城镇 + 信徒 + 类型") return [`${place("adj")}${type}`, "global"];
    if (m === "随机 + 信徒 + 类型") return [`${getAdjective(random())}${type}`, "global"];
    if (m === "含义 + 类型") return [`${generateMeaning()}的${type}`, "global"];
    return [trimVowels(random()) + "主义", "global"]; // 否则
  }

  return {generate, add, getDeityName, updateCultures, recalculate};
})();