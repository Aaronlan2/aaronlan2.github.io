"use strict";

window.Markers = (function () {
  let config = getDefaultConfig();
  let occupied = [];

  function getDefaultConfig() {
    const culturesSet = document.getElementById("culturesSet").value;
    const isFantasy = culturesSet.includes("Fantasy");

    /*
      Default markers config:
      type - short description (snake-case)
      icon - unicode character or url to image
      dx: icon offset in x direction, in pixels
      dy: icon offset in y direction, in pixels
      min: minimum number of candidates to add at least 1 marker
      each: how many of the candidates should be added as markers
      multiplier: multiply markers quantity to add
      list: function to select candidates
      add: function to add marker legend
    */
    // prettier-ignore
    return [
      {type: "volcanoes", icon: "🌋", dx: 52, px: 13, min: 10, each: 500, multiplier: 1, list: listVolcanoes, add: addVolcano},
      {type: "hot-springs", icon: "♨️", dy: 52, min: 30, each: 1200, multiplier: 1, list: listHotSprings, add: addHotSpring},
      {type: "water-sources", icon: "💧", min: 1, each: 1000, multiplier: 1, list: listWaterSources, add: addWaterSource},
      {type: "mines", icon: "⛏️", dx: 48, px: 13, min: 1, each: 15, multiplier: 1, list: listMines, add: addMine},
      {type: "bridges", icon: "🌉", px: 14, min: 1, each: 5, multiplier: 1, list: listBridges, add: addBridge},
      {type: "inns", icon: "🍻", px: 14, min: 1, each: 10, multiplier: 1, list: listInns, add: addInn},
      {type: "lighthouses", icon: "🚨", px: 14, min: 1, each: 2, multiplier: 1, list: listLighthouses, add: addLighthouse},
      {type: "waterfalls", icon: "⟱", dy: 54, px: 16, min: 1, each: 5, multiplier: 1, list: listWaterfalls, add: addWaterfall},
      {type: "battlefields", icon: "⚔️", dy: 52, min: 50, each: 700, multiplier: 1, list: listBattlefields, add: addBattlefield},
      {type: "dungeons", icon: "🗝️", dy: 51, px: 13, min: 30, each: 200, multiplier: 1, list: listDungeons, add: addDungeon},
      {type: "lake-monsters", icon: "🐉", dy: 48, min: 2, each: 10, multiplier: 1, list: listLakeMonsters, add: addLakeMonster},
      {type: "sea-monsters", icon: "🦑", min: 50, each: 700, multiplier: 1, list: listSeaMonsters, add: addSeaMonster},
      {type: "hill-monsters", icon: "👹", dy: 54, px: 13, min: 30, each: 600, multiplier: 1, list: listHillMonsters, add: addHillMonster},
      {type: "sacred-mountains", icon: "🗻", dy: 48, min: 1, each: 5, multiplier: 1, list: listSacredMountains, add: addSacredMountain},
      {type: "sacred-forests", icon: "🌳", min: 30, each: 1000, multiplier: 1, list: listSacredForests, add: addSacredForest},
      {type: "sacred-pineries", icon: "🌲", px: 13, min: 30, each: 800, multiplier: 1, list: listSacredPineries, add: addSacredPinery},
      {type: "sacred-palm-groves", icon: "🌴", px: 13, min: 1, each: 100, multiplier: 1, list: listSacredPalmGroves, add: addSacredPalmGrove},
      {type: "brigands", icon: "💰", px: 13, min: 50, each: 100, multiplier: 1, list: listBrigands, add: addBrigands},
      {type: "pirates", icon: "🏴‍☠️", dx: 51, min: 40, each: 300, multiplier: 1, list: listPirates, add: addPirates},
      {type: "statues", icon: "🗿", min: 80, each: 1200, multiplier: 1, list: listStatues, add: addStatue},
      {type: "ruins", icon: "🏺", min: 80, each: 1200, multiplier: 1, list: listRuins, add: addRuins},
      {type: "libraries", icon: "📚", min: 10, each: 1200, multiplier: 1, list: listLibraries, add: addLibrary},
      {type: "circuses", icon: "🎪", min: 80, each: 1000, multiplier: 1, list: listCircuses, add: addCircuse},
      {type: "jousts", icon: "🤺", dx: 48, min: 5, each: 500, multiplier: 1, list: listJousts, add: addJoust},
      {type: "fairs", icon: "🎠", min: 50, each: 1000, multiplier: 1, list: listFairs, add: addFair},
      {type: "canoes", icon: "🛶", min: 500, each: 2000, multiplier: 1, list: listCanoes, add: addCanoe},
      {type: "migration", icon: "🐗", min: 20, each: 1000, multiplier: 1, list: listMigrations, add: addMigration},
      {type: "dances", icon: "💃🏽", min: 50, each: 1000, multiplier: 1, list: listDances, add: addDances},
      {type: "mirage", icon: "💦", min: 10, each: 400, multiplier: 1, list: listMirage, add: addMirage},
      {type: "caves", icon:"🦇", min: 60, each: 1000, multiplier: 1, list: listCaves, add: addCave},
      {type: "portals", icon: "🌀", px: 14, min: 16, each: 8, multiplier: +isFantasy, list: listPortals, add: addPortal},
      {type: "rifts", icon: "🎆", min: 5, each: 3000, multiplier: +isFantasy, list: listRifts, add: addRift},
      {type: "disturbed-burials", icon: "💀", min: 20, each: 3000, multiplier: +isFantasy, list: listDisturbedBurial, add: addDisturbedBurial},
      {type: "necropolises", icon: "🪦", min: 20, each: 1000, multiplier: 1, list: listNecropolis, add: addNecropolis},
      {type: "encounters", icon: "🧙", min: 10, each: 600, multiplier: 1, list: listEncounters, add: addEncounter},
    ];
  }

  const getConfig = () => config;

  const setConfig = (newConfig) => {
    config = newConfig;
  };

  const generate = function () {
    setConfig(getDefaultConfig());
    pack.markers = [];
    generateTypes();
  };

  const regenerate = () => {
    pack.markers = pack.markers.filter(({ i, lock, cell }) => {
      if (lock) {
        occupied[cell] = true;
        return true;
      }
      const id = `marker${i}`;
      document.getElementById(id)?.remove();
      const index = notes.findIndex((note) => note.id === id);
      if (index != -1) notes.splice(index, 1);
      return false;
    });

    generateTypes();
  };

  const add = (marker) => {
    const base = config.find((c) => c.type === marker.type);
    if (base) {
      const { icon, type, dx, dy, px } = base;
      marker = addMarker({ icon, type, dx, dy, px }, marker);
      base.add("marker" + marker.i, marker.cell);
      return marker;
    }

    const i = last(pack.markers)?.i + 1 || 0;
    pack.markers.push({ ...marker, i });
    occupied[marker.cell] = true;
    return { ...marker, i };
  };

  function generateTypes() {
    TIME && console.time("addMarkers");

    config.forEach(
      ({ type, icon, dx, dy, px, min, each, multiplier, list, add }) => {
        if (multiplier === 0) return;

        let candidates = Array.from(list(pack));
        let quantity = getQuantity(candidates, min, each, multiplier);
        // uncomment for debugging:
        // console.info(`${icon}${type}: each ${each} of ${candidates.length}, min ${min} candidates. Got ${quantity}`);

        while (quantity && candidates.length) {
          const [cell] = extractAnyElement(candidates);
          const marker = addMarker({ icon, type, dx, dy, px }, { cell });
          if (!marker) continue;
          add("marker" + marker.i, cell);
          quantity--;
        }
      }
    );

    occupied = [];
    TIME && console.timeEnd("addMarkers");
  }

  function getQuantity(array, min, each, multiplier) {
    if (!array.length || array.length < min / multiplier) return 0;
    const requestQty = Math.ceil((array.length / each) * multiplier);
    return array.length < requestQty ? array.length : requestQty;
  }

  function extractAnyElement(array) {
    const index = Math.floor(Math.random() * array.length);
    return array.splice(index, 1);
  }

  function getMarkerCoordinates(cell) {
    const { cells, burgs } = pack;
    const burgId = cells.burg[cell];

    if (burgId) {
      const { x, y } = burgs[burgId];
      return [x, y];
    }

    return cells.p[cell];
  }

  function addMarker(base, marker) {
    if (marker.cell === undefined) return;
    const i = last(pack.markers)?.i + 1 || 0;
    const [x, y] = getMarkerCoordinates(marker.cell);
    marker = { ...base, x, y, ...marker, i };
    pack.markers.push(marker);
    occupied[marker.cell] = true;
    return marker;
  }

  function deleteMarker(markerId) {
    const noteId = "marker" + markerId;
    notes = notes.filter((note) => note.id !== noteId);
    pack.markers = pack.markers.filter((m) => m.i !== markerId);
  }

  function listVolcanoes({ cells }) {
    return cells.i.filter((i) => !occupied[i] && cells.h[i] >= 70);
  }

  function addVolcano(id, cell) {
    const { cells } = pack;

    const proper = Names.getCulture(cells.culture[cell]);
    const name = P(0.3) ? proper + "山" : P(0.7) ? proper + "火山" : proper;
    const status = P(0.6) ? "休眠" : P(0.4) ? "活跃" : "喷发中";
    notes.push({
      id,
      name,
      legend: `${status}火山。高度: ${getFriendlyHeight(cells.p[cell])}。`,
    });
  }

  function listHotSprings({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] > 50 && cells.culture[i]
    );
  }

  function addHotSpring(id, cell) {
    const { cells } = pack;

    const proper = Names.getCulture(cells.culture[cell]);
    const temp = convertTemperature(gauss(35, 15, 20, 100));
    const name = P(0.3)
      ? proper + "温泉"
      : P(0.7)
      ? proper + "温泉"
      : proper;
    const legend = `这是一处天然加热的地热泉，提供放松身心和医疗保健的功效。平均温度为 ${temp}。`;

    notes.push({ id, name, legend });
  }

  function listWaterSources({ cells }) {
    return cells.i.filter((i) => !occupied[i] && cells.h[i] > 30 && cells.r[i]);
  }

  function addWaterSource(id, cell) {
    const { cells } = pack;

    const type = rw({
      "治愈之泉": 5,
      "净化之井": 2,
      "附魔蓄水池": 1,
      "幸运小溪": 1,
      "青春之泉": 1,
      "智慧之泉": 1,
      "生命之泉": 1,
      "青春源泉": 1,
      "治愈溪流": 1,
    });

    const proper = Names.getCulture(cells.culture[cell]);
    const name = `${proper}${type}`;
    const legend =
      "这一传奇水源在古老传说中被人们传颂，据说拥有神秘的力量。泉水清澈见底，闪烁着超凡脱俗的虹彩，即使在最昏暗的光线下也熠熠生辉。";

    notes.push({ id, name, legend });
  }

  function listMines({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] > 47 && cells.burg[i]
    );
  }

  function addMine(id, cell) {
    const { cells } = pack;

    const resources = {
      salt: 5,
      gold: 2,
      silver: 4,
      copper: 2,
      iron: 3,
      lead: 1,
      tin: 1,
    };
    const resource = rw(resources);
    const burg = pack.burgs[cells.burg[cell]];
    const name = `${burg.name} — ${resource}矿山`;
    const population = rn(burg.population * populationRate * urbanization);
    const legend = `${burg.name}是一个${population}人附近的${resource}矿山。`;
    notes.push({ id, name, legend });
  }

  function listBridges({ cells, burgs }) {
    const meanFlux = d3.mean(cells.fl.filter((fl) => fl));
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.burg[i] &&
        cells.t[i] !== 1 &&
        burgs[cells.burg[i]].population > 20 &&
        cells.r[i] &&
        cells.fl[i] > meanFlux
    );
  }

  function addBridge(id, cell) {
    const { cells } = pack;

    const burg = pack.burgs[cells.burg[cell]];
    const river = pack.rivers.find((r) => r.i === pack.cells.r[cell]);
    const riverName = river ? `${river.name}${river.type}` : "河流";
    const name =
      river && P(0.2) ? `${river.name}桥` : `${burg.name}桥`;
    const weightedAdjectives = {
      stone: 10,
      wooden: 1,
      lengthy: 2,
      formidable: 2,
      rickety: 1,
      beaten: 1,
      weathered: 1,
    };
    const barriers = [
      "在洪水中倒塌",
      "传闻会吸引巨魔",
      "当地贸易枯竭",
      "该地区匪患猖獗",
      "旧的路标点崩塌",
    ];
    const legend = P(0.7)
      ? `一座${rw(weightedAdjectives)}的桥横跨在${burg.name}附近的${riverName}上。`
      : `这是${riverName}上一处古老的渡口，自${ra(barriers)}之后就很少有人使用了。`;

    notes.push({ id, name, legend });
  }

  function listInns({ cells }) {
    const crossRoads = cells.i.filter(
      (i) => !occupied[i] && cells.pop[i] > 5 && Routes.isCrossroad(i)
    );
    return crossRoads;
  }

  function addInn(id, cell) {
    const colors = [
      "深色",
      "浅色",
      "明亮色",
      "金色",
      "白色",
      "黑色",
      "红色",
      "粉色",
      "紫色",
      "蓝色",
      "绿色",
      "黄色",
      "琥珀色",
      "橙色",
      "棕色",
      "灰色",
    ];
    const animals = [
      "羚羊",
      "猿",
      "獾",
      "熊",
      "河狸",
      "野牛",
      "野猪",
      "水牛",
      "猫",
      "鹤",
      "鳄鱼",
      "乌鸦",
      "鹿",
      "狗",
      "鹰",
      "驼鹿",
      "狐狸",
      "山羊",
      "鹅",
      "野兔",
      "鹰",
      "鹭",
      "马",
      "鬣狗",
      "朱鹭",
      "豺",
      "美洲虎",
      "云雀",
      "豹",
      "狮子",
      "螳螂",
      "貂",
      "驼鹿",
      "骡子",
      "独角鲸",
      "猫头鹰",
      "黑豹",
      "老鼠",
      "渡鸦",
      "白嘴鸦",
      "蝎子",
      "鲨鱼",
      "绵羊",
      "蛇",
      "蜘蛛",
      "天鹅",
      "老虎",
      "乌龟",
      "狼",
      " Wolverine",
      "骆驼",
      "猎鹰",
      "猎犬",
      "公牛",
    ];
    const adjectives = [
      "新的",
      "好的",
      "高的",
      "旧的",
      "伟大的",
      "大的",
      "主要的",
      "快乐的",
      "主要的",
      "巨大的",
      "远的",
      "美丽的",
      "公平的",
      "优质的",
      "古老的",
      "金色的",
      "骄傲的",
      "幸运的",
      "胖的",
      "诚实的",
      "巨大的",
      "遥远的",
      "友好的",
      "响亮的",
      "饥饿的",
      "神奇的",
      "卓越的",
      "和平的",
      "冰冻的",
      "神圣的",
      "有利的",
      "勇敢的",
      "阳光明媚的",
      "飞行的",
    ];
    const methods = [
      "水煮",
      "烤",
      "烘烤",
      "叉烤",
      "炖煮",
      "填充",
      "罐焖",
      "捣碎",
      "烘焙",
      "炖烧",
      "水煮",
      "腌制",
      "泡菜",
      "烟熏",
      "干燥",
      "干腌",
      "腌渍",
      "油炸",
      "煎",
      "油炸",
      "装饰",
      "蒸",
      "腌制",
      "糖浆浸泡",
      "火焰烤制",
    ];
    const courses = [
      "牛肉",
      "猪肉",
      "培根",
      "鸡肉",
      "羊肉",
      "山羊肉",
      "野兔",
      "兔子",
      "雄鹿",
      "鹿",
      "鹿角",
      "熊肉",
      "水牛肉",
      "獾肉",
      "河狸肉",
      "火鸡",
      "野鸡",
      "鸭肉",
      "鹅肉",
      "水鸭",
      "鹌鹑",
      "鸽子",
      "海豹肉",
      "鲤鱼",
      "鲈鱼",
      "梭鱼",
      "鲶鱼",
      "鲟鱼",
      "扇贝",
      "派",
      "蛋糕",
      "粥",
      "布丁",
      "洋葱",
      "胡萝卜",
      "土豆",
      "甜菜",
      "大蒜",
      "卷心菜",
      "茄子",
      "鸡蛋",
      "西兰花",
      "西葫芦",
      "辣椒",
      "橄榄",
      "南瓜",
      "菠菜",
      "豌豆",
      "鹰嘴豆",
      "豆子",
      "米饭",
      "意大利面",
      "面包",
      "苹果",
      "桃子",
      "梨",
      "甜瓜",
      "橙子",
      "芒果",
      "西红柿",
      "奶酪",
      "玉米",
      "老鼠尾巴",
      "猪耳朵",
    ];
    const types = [
      "热的",
      "冷的",
      "火味的",
      "冰爽的",
      "烟熏味的",
      "朦胧的",
      "闪亮的",
      "甜的",
      "苦的",
      "咸的",
      "酸的",
      "起泡的",
      "有异味的",
    ];
    const drinks = [
      "葡萄酒",
      "白兰地",
      "杜松子酒",
      "威士忌",
      "朗姆酒",
      "啤酒",
      "苹果酒",
      "蜂蜜酒",
      "烈酒",
      "蒸馏酒",
      "伏特加",
      "龙舌兰酒",
      "苦艾酒",
      "花蜜酒",
      "牛奶",
      "克瓦斯",
      "马奶酒",
      "茶",
      "水",
      "果汁",
      "树液",
    ];

      const typeName = P(0.3) ? "客栈" : "酒馆";
    const isAnimalThemed = P(0.7);
    const animal = ra(animals);
    const name = isAnimalThemed
      ? P(0.6)
        ? ra(colors)+ animal
        : ra(adjectives) + animal
      : ra(adjectives) + capitalize(typeName);
    const meal = isAnimalThemed && P(0.3) ? animal : ra(courses);
    const course = `${ra(methods)}${meal}`.toLowerCase();
    const drink = `${P(0.5) ? ra(types) : ra(colors)}${ra(
      drinks
    )}`.toLowerCase();
    const legend = `一家又大又有名的路边${typeName}。这里供应美味的${course}和${drink}。`;
    notes.push({ id, name: name, legend });
  }

  function listLighthouses({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.harbor[i] > 6 &&
        cells.c[i].some((c) => cells.h[c] < 20 && Routes.isConnected(c))
    );
  }

  function addLighthouse(id, cell) {
    const { cells } = pack;

    const proper = cells.burg[cell]
      ? pack.burgs[cells.burg[cell]].name
      : Names.getCulture(cells.culture[cell]);
    notes.push({
      id,
      name: getAdjective(proper) + "灯塔" + name,
      legend: `一座为公海上的船只充当航标的灯塔。`,
    });
  }

  function listWaterfalls({ cells }) {
    return cells.i.filter(
      (i) =>
        cells.r[i] &&
        !occupied[i] &&
        cells.h[i] >= 50 &&
        cells.c[i].some((c) => cells.h[c] < 40 && cells.r[c])
    );
  }

  function addWaterfall(id, cell) {
    const { cells } = pack;

    const descriptions = [
      "这里流淌着一条绝美的瀑布。",
      "一处格外美丽的瀑布，水流湍急。",
      "一条令人印象深刻的瀑布穿地而过。",
      "一座壮观的瀑布，水流飞泻而下。",
      "一条河流从高处倾泻而下，形成了一座奇妙的瀑布。",
      "一座令人叹为观止的瀑布横穿大地。",
    ];

    const proper = cells.burg[cell]
      ? pack.burgs[cells.burg[cell]].name
      : Names.getCulture(cells.culture[cell]);
    notes.push({
      id,
      name: getAdjective(proper) + "瀑布" + name,
      legend: `${ra(descriptions)}`,
    });
  }

  function listBattlefields({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.state[i] &&
        cells.pop[i] > 2 &&
        cells.h[i] < 50 &&
        cells.h[i] > 25
    );
  }

  function addBattlefield(id, cell) {
    const { cells, states } = pack;

    const state = states[cells.state[cell]];
    if (!state.campaigns)
      state.campaigns = BurgsAndStates.generateCampaign(state);
    const campaign = ra(state.campaigns);
    const date = generateDate(campaign.start, campaign.end);
    const name = Names.getCulture(cells.culture[cell]) + "战场";
    const legend = `${campaign.name}的一场历史战役。\r\n日期: ${date}${options.era}。`;
    notes.push({ id, name, legend });
  }

  function listDungeons({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.pop[i] && cells.pop[i] < 3
    );
  }

  function addDungeon(id, cell) {
    const dungeonSeed = `${seed}${cell}`;
    const name = "地下城";
    const legend = `<div>未发现的地下城。请访问 <a href="https://watabou.github.io/one-page-dungeon/?seed=${dungeonSeed}" target="_blank">单页地下城</a></div><iframe style="pointer-events: none;" src="https://watabou.github.io/one-page-dungeon/?seed=${dungeonSeed}" sandbox="allow-scripts allow-same-origin"></iframe>`;
    notes.push({ id, name, legend });
  }

  function listLakeMonsters({ features }) {
    return features
      .filter(
        (feature) =>
          feature.type === "lake" &&
          feature.group === "freshwater" &&
          !occupied[feature.firstCell]
      )
      .map((feature) => feature.firstCell);
  }

  function addLakeMonster(id, cell) {
    const lake = pack.features[pack.cells.f[cell]];

    // Check that the feature is a lake in case the user clicked on a wrong
    // square
    if (lake.type !== "lake") return;

    const name = `怪物${lake.name}`;
    const length = gauss(10, 5, 5, 100);
    const subjects = [
      "当地人",
      "长者",
      "铭文记载",
      "酒徒",
      "传说",
      "传言",
      "谣言",
      "旅人",
      "故事",
    ];
    const legend = `${ra(subjects)}称，一只长${length}${heightUnit.value}的远古怪物栖息在${lake.name}湖中。不论真假，人们都不敢在湖中捕鱼了。`;
    notes.push({ id, name, legend });
  }

  function listSeaMonsters({ cells, features }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.h[i] < 20 &&
        Routes.isConnected(i) &&
        features[cells.f[i]].type === "ocean"
    );
  }

  function addSeaMonster(id, cell) {
    const name = `${Names.getCultureShort(0)}海怪`;
    const length = gauss(25, 10, 10, 100);
    const legend = `老水手们讲述着栖息在这些危险海域的巨大海怪的故事。传闻它体长可达${length}${heightUnit.value}。`;
    notes.push({ id, name, legend });
  }

  function listHillMonsters({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] >= 50 && cells.pop[i]
    );
  }

  function addHillMonster(id, cell) {
    const { cells } = pack;

    const adjectives = [
      "伟大的",
      "大的",
      "巨大的",
      "原始的",
      "金色的",
      "自豪的",
      "幸运的",
      "肥的",
      "巨人的",
      "饥饿的",
      "神奇的",
      "优越的",
      "恐怖的",
      "恐怖的",
      "恐惧的",
    ];
    const subjects = [
      "当地人",
      "长者",
      "铭文记载",
      "酒徒",
      "传说",
      "传言",
      "谣言",
      "旅人",
      "故事",
    ];
    const species = [
      "食人魔",
      "巨魔",
      "独眼巨人",
      "巨人",
      "怪物",
      "野兽",
      "龙",
      "不死族",
      "食尸鬼",
      "吸血鬼",
      "女巫",
      "女妖",
      "有胡须的恶魔",
      "大鹏鸟",
      "九头蛇",
      "座狼",
    ];
    const modusOperandi = [
      "夜间偷牛",
      "偏爱食用儿童",
      "不介意吃人肉",
      "令该地区人心惶惶",
      "整吞小孩",
      "绑架年轻女子",
      "恐吓该地区居民",
      "骚扰当地旅客",
      "从家中抓走居民",
      "攻击任何胆敢靠近其巢穴的人",
      "袭击毫无防备的受害者",
    ];

    const monster = ra(species);
    const toponym = Names.getCulture(cells.culture[cell]);
    const name = `${toponym}${monster}`;
    const legend = `${ra(subjects)}提到，有一只${ra(
      adjectives
    )}${monster}栖息在${toponym}山丘，并${ra(modusOperandi)}。`;
    notes.push({ id, name, legend });
  }

  // Sacred mountains spawn on lonely mountains
  function listSacredMountains({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.h[i] >= 70 &&
        cells.c[i].some((c) => cells.culture[c]) &&
        cells.c[i].every((c) => cells.h[c] < 60)
    );
  }

  function addSacredMountain(id, cell) {
    const { cells, religions } = pack;

    const culture = cells.c[cell].map((c) => cells.culture[c]).find((c) => c);
    const religion = cells.religion[cell];
    const name = `${Names.getCulture(culture)}山`;
    const height = getFriendlyHeight(cells.p[cell]);
    const legend = `${religions[religion].name}的圣山。高度: ${height}。`;
    notes.push({ id, name, legend });
  }

  // Sacred forests spawn on temperate forests
  function listSacredForests({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.culture[i] &&
        cells.religion[i] &&
        [6, 8].includes(cells.biome[i])
    );
  }

  function addSacredForest(id, cell) {
    const { cells, religions } = pack;

    const culture = cells.culture[cell];
    const religion = cells.religion[cell];
    const name = `${Names.getCulture(culture)}森林`;
    const legend = `一片对当地${religions[religion].name}而言神圣的森林。`;
    notes.push({ id, name, legend });
  }

  // Sacred pineries spawn on boreal forests
  function listSacredPineries({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.culture[i] &&
        cells.religion[i] &&
        cells.biome[i] === 9
    );
  }

  function addSacredPinery(id, cell) {
    const { cells, religions } = pack;

    const culture = cells.culture[cell];
    const religion = cells.religion[cell];
    const name = `${Names.getCulture(culture)}松林`;
    const legend = `一片对当地${religions[religion].name}而言神圣的松林。`;
    notes.push({ id, name, legend });
  }

  // Sacred palm groves spawn on oasises
  function listSacredPalmGroves({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.culture[i] &&
        cells.religion[i] &&
        cells.biome[i] === 1 &&
        cells.pop[i] > 1 &&
        Routes.isConnected(i)
    );
  }

  function addSacredPalmGrove(id, cell) {
    const { cells, religions } = pack;

    const culture = cells.culture[cell];
    const religion = cells.religion[cell];
    const name = `${Names.getCulture(culture)}棕榈树林`;
    const legend = `一片对当地${religions[religion].name}而言神圣的棕榈树林。`;
    notes.push({ id, name, legend });
  }

  function listBrigands({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.culture[i] && Routes.hasRoad(i)
    );
  }

  function addBrigands(id, cell) {
    const { cells } = pack;

    const animals = [
      "猿猴",
      "獾",
      "熊",
      "河狸",
      "野牛",
      "野猪",
      "猫",
      "乌鸦",
      "狗",
      "狐狸",
      "野兔",
      "鹰",
      "鬣狗",
      "豺狼",
      "美洲虎",
      "豹",
      "狮子",
      "猫头鹰",
      "黑豹",
      "老鼠",
      "渡鸦",
      "白嘴鸦",
      "蝎子",
      "鲨鱼",
      "蛇",
      "蜘蛛",
      "老虎",
      "狼",
      "狼獾",
      "猎鹰",
    ];
    const types = { brigands: 4, bandits: 3, robbers: 1, highwaymen: 1 };

    const culture = cells.culture[cell];
    const biome = cells.biome[cell];
    const height = cells.p[cell];

    const locality = ((height, biome) => {
      if (height >= 70) return "高地";
      if ([1, 2].includes(biome)) return "沙漠";
      if ([3, 4].includes(biome)) return "骑马";
      if ([5, 6, 7, 8, 9].includes(biome)) return "森林";
      if (biome === 12) return "沼泽";
      return "愤怒的";
    })(height, biome);

    const name = `${Names.getCulture(culture)}${ra(animals)}`;
    const legend = `一群 ${locality}${rw(types) === 'brigands' ? '盗匪' : rw(types) === 'bandits' ? '土匪' : rw(types) === 'robbers' ? '强盗' : '拦路劫匪'}。`;
    notes.push({ id, name, legend });
  }

  // 海盗出现在海上航线
  function listPirates({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] < 20 && Routes.isConnected(i)
    );
  }

  function addPirates(id, cell) {
    const name = "海盗";
    const legend = "在这些水域发现了海盗船。";
    notes.push({ id, name, legend });
  }

  function listStatues({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] >= 20 && cells.h[i] < 40
    );
  }

  function addStatue(id, cell) {
    const { cells } = pack;

    const variants = [
      "雕像",
      "方尖碑",
      "纪念碑",
      "圆柱",
      "独石碑",
      "柱子",
      "巨石",
      "石碑",
      "符文石",
      "雕塑",
      "雕像",
      "神像",
    ];
    const scripts = {
      cypriot: "𐠁𐠂𐠃𐠄𐠅𐠈𐠊𐠋𐠌𐠍𐠎𐠏𐠐𐠑𐠒𐠓𐠔𐠕𐠖𐠗𐠘𐠙𐠚𐠛𐠜𐠝𐠞𐠟𐠠𐠡𐠢𐠣𐠤𐠥𐠦𐠧𐠨𐠩𐠪𐠫𐠬𐠭𐠮𐠯𐠰𐠱𐠲𐠳𐠴𐠵𐠷𐠸𐠼𐠿      ",
      geez: "ሀለሐመሠረሰቀበተኀነአከወዐዘየደገጠጰጸፀፈፐ   ",
      coptic: "ⲲⲴⲶⲸⲺⲼⲾⳀⳁⳂⳃⳄⳆⳈⳊⳌⳎⳐⳒⳔⳖⳘⳚⳜⳞⳠⳢⳤ⳥⳧⳩⳪ⳫⳬⳭⳲ⳹⳾   ",
      tibetan: "ༀ༁༂༃༄༅༆༇༈༉༊་༌༐༑༒༓༔༕༖༗༘༙༚༛༜༠༡༢༣༤༥༦༧༨༩༪༫༬༭༮༯༰༱༲༳༴༵༶༷༸༹༺༻༼༽༾༿",
      mongolian:
        "᠀᠐᠑᠒ᠠᠡᠦᠧᠨᠩᠪᠭᠮᠯᠰᠱᠲᠳᠵᠻᠼᠽᠾᠿᡀᡁᡆᡍᡎᡏᡐᡑᡒᡓᡔᡕᡖᡗᡙᡜᡝᡞᡟᡠᡡᡭᡮᡯᡰᡱᡲᡳᡴᢀᢁᢂᢋᢏᢐᢑᢒᢓᢛᢜᢞᢟᢠᢡᢢᢤᢥᢦ",
    };

    const culture = cells.culture[cell];

    const variant = ra(variants);
    const name = `${Names.getCulture(culture)}${variant}`;
    const script = scripts[ra(Object.keys(scripts))];
    const inscription = Array(rand(40, 100))
      .fill(null)
      .map(() => ra(script))
      .join("");
    const legend = `一座古老的${variant.toLowerCase()}。它上面有一段铭文，但无人能翻译：
        <div style="font-size: 1.8em; line-break: anywhere;">${inscription}</div>`;
    notes.push({ id, name, legend });
  }

  function listRuins({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] && cells.culture[i] && cells.h[i] >= 20 && cells.h[i] < 60
    );
  }

  function addRuins(id, cell) {
    const types = [
      "城市",
      "城镇",
      "定居点",
      "金字塔",
      "堡垒",
      "据点",
      "庙宇",
      "圣地",
      "陵墓",
      "前哨站",
      "防御工事",
      "要塞",
      "城堡",
    ];

    const ruinType = ra(types);
    const name = `废弃的${ruinType}`;
    const legend = `一座古老的${ruinType}遗迹。其中可能藏有无数财宝。`;
    notes.push({ id, name, legend });
  }

  function listLibraries({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] && cells.culture[i] && cells.burg[i] && cells.pop[i] > 10
    );
  }

  function addLibrary(id, cell) {
    const { cells } = pack;

    const type = rw({ Library: 3, Archive: 1, Collection: 1 });
    const name = `${Names.getCulture(cells.culture[cell])}${type}`;
    const legend =
      "海量的知识汇集，包含许多珍稀古老的书籍。";

    notes.push({ id, name, legend });
  }

  function listCircuses({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.culture[i] &&
        cells.h[i] >= 20 &&
        Routes.isConnected(i)
    );
  }

  function addCircuse(id, cell) {
    const adjectives = [
      "奇幻的",
      "奇妙的",
      "难以理解的",
      "魔法的",
      "非凡的",
      "不容错过的",
      "举世闻名的",
      "令人惊叹的",
    ];

    const adjective = ra(adjectives);
    const name = `巡回${adjective}马戏团`;
    const legend = `快来快来，这个${adjective.toLowerCase()}的马戏团限时演出啦！`;
    notes.push({ id, name, legend });
  }

  function listJousts({ cells, burgs }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] && cells.burg[i] && burgs[cells.burg[i]].population > 20
    );
  }

  function addJoust(id, cell) {
    const { cells, burgs } = pack;
    const types = ["马上长枪比武", "竞赛", "混战", "锦标赛", "比赛"];
    const virtues = [
      "智谋",
      "力量",
      "速度",
      "强者对决",
      "敏锐",
      "勇猛",
    ];

    if (!cells.burg[cell]) return;
    const burgName = burgs[cells.burg[cell]].name;
    const type = ra(types);
    const virtue = ra(virtues);

    const name = `${burgName}${type}`;
    const legend = `来自各地的勇士齐聚${burgName}，参加这场以${virtue}为主题的${type}，胜利者将收获荣耀、财富和恩宠。`;
    notes.push({ id, name, legend });
  }

  function listFairs({ cells, burgs }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        cells.burg[i] &&
        burgs[cells.burg[i]].population < 20 &&
        burgs[cells.burg[i]].population < 5
    );
  }

  function addFair(id, cell) {
    const { cells, burgs } = pack;
    if (!cells.burg[cell]) return;

    const burgName = burgs[cells.burg[cell]].name;
    const type = "集市";

    const name = `${burgName}${type}`;
    const legend = `${burgName}正在举办一场集市，提供各种各样的本地和外国商品及服务。`;
    notes.push({ id, name, legend });
  }

  function listCanoes({ cells }) {
    return cells.i.filter((i) => !occupied[i] && cells.r[i]);
  }

  function addCanoe(id, cell) {
    const river = pack.rivers.find((r) => r.i === pack.cells.r[cell]);

    const name = `小型码头`;
    const riverName = river ? `${river.name}${river.type}` : "河流";
    const legend = `在${riverName}边有一处小码头，可供船只下水。码头上有一位看上去疲惫的船主，愿意出售沿河航行的船票。`;
    notes.push({ id, name, legend });
  }

  function listMigrations({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] >= 20 && cells.pop[i] <= 2
    );
  }

  function addMigration(id, cell) {
    const animals = [
      "羚羊",
      "猿",
      "獾",
      "熊",
      "河狸",
      "野牛",
      "野猪",
      "水牛",
      "猫",
      "鹤",
      "鳄鱼",
      "乌鸦",
      "鹿",
      "狗",
      "鹰",
      "驼鹿",
      "狐狸",
      "山羊",
      "鹅",
      "野兔",
      "鹰",
      "鹭",
      "马",
      "鬣狗",
      "朱鹭",
      "豺",
      "美洲虎",
      "云雀",
      "豹",
      "狮子",
      "螳螂",
      "貂",
      "驼鹿",
      "骡子",
      "猫头鹰",
      "黑豹",
      "老鼠",
      "渡鸦",
      "白嘴鸦",
      "蝎子",
      "鲨鱼",
      "绵羊",
      "蛇",
      "蜘蛛",
      "老虎",
      "狼",
      "狼獾",
      "骆驼",
      "猎鹰",
      "猎犬",
      "公牛",
    ];
    const animalChoice = ra(animals);

    const name = `${animalChoice}迁徙`;
    const legend = `一大群${animalChoice}正在迁徙，这可能是它们的年度常规活动，也可能是更为特殊的事件。`;
    notes.push({ id, name, legend });
  }

  function listDances({ cells, burgs }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] && cells.burg[i] && burgs[cells.burg[i]].population > 15
    );
  }

  function addDances(id, cell) {
    const { cells, burgs } = pack;
    const burgName = burgs[cells.burg[cell]].name;
    const socialTypes = [
      "盛会",
      "舞会",
      "表演",
      "舞会",
      "社交晚会",
      "欢乐聚会",
      "展览",
      "狂欢节",
      "节日",
      "庆典",
      "庆祝活动",
      "聚会",
      "宴会",
    ];
    const people = [
      "名流贤达",
      "贵族",
      "当地长老",
      "外国政要",
      "精神领袖",
      "疑似革命者",
    ];
    const socialType = ra(socialTypes);

    const name = `${burgName}${socialType}`;
    const legend = `在${burgName}举办了一场 ${socialType}，旨在召集该地区的${ra(
      people
    )}欢聚一堂，共享欢乐时光，缔结联盟，并围绕危机制定计划。`;
    notes.push({ id, name, legend });
  }

  function listMirage({ cells }) {
    return cells.i.filter((i) => !occupied[i] && cells.biome[i] === 1);
  }

  function addMirage(id, cell) {
    const adjectives = [
      "迷人的",
      "透明的",
      "虚幻的",
      "遥远的",
      "奇特的",
    ];

    const mirageAdjective = ra(adjectives);
    const name = `${mirageAdjective}海市蜃楼`;
    const legend = `这道${mirageAdjective}的海市蜃楼已经诱使旅人们偏离路线无数岁月了。`;
    notes.push({ id, name, legend });
  }

  function listCaves({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] >= 50 && cells.pop[i]
    );
  }

  function addCave(id, cell) {
    const { cells } = pack;

    const formations = {
      "洞穴": 10,
      "大洞": 8,
      "裂谷": 6,
      "峡谷": 6,
      "裂缝": 5,
      "石窟": 4,
      "坑洞": 4,
      "天坑": 2,
      "孔洞": 2,
    };
    const status = {
      "藏匿宝藏的好地方": 5,
      "奇异怪物的栖息地": 5,
      "完全空无一物": 4,
      "深不见底且未被探索过": 4,
      "完全被水淹没": 2,
      "正在缓慢填充岩浆": 1,
    };

    let formation = rw(formations);
    const toponym = Names.getCulture(cells.culture[cell]);
    if (cells.biome[cell] === 11) {
      formation =  formation + "冰川";
    }
    const name = `${toponym}${formation}`;
    const legend = `${name}。当地人声称这里${rw(status)}。`;
    notes.push({ id, name, legend });
  }

  function listPortals({ burgs }) {
    return burgs
      .slice(1, Math.ceil(burgs.length / 10) + 1)
      .filter(({ cell }) => !occupied[cell])
      .map((burg) => burg.cell);
  }

  function addPortal(id, cell) {
    const { cells, burgs } = pack;

    if (!cells.burg[cell]) return;
    const burgName = burgs[cells.burg[cell]].name;

    const name = `${burgName}传送门`;
    const legend = `连接主要城市的魔法传送门系统的一部分。这些传送门在几个世纪前就已安装，但至今仍运行良好。`;
    notes.push({ id, name, legend });
  }

  function listRifts({ cells }) {
    return cells.i.filter(
      (i) =>
        !occupied[i] &&
        pack.cells.pop[i] <= 3 &&
        biomesData.habitability[pack.cells.biome[i]]
    );
  }

  function addRift(id, cell) {
    const types = [
      "恶魔",
      "跨维度",
      "深渊",
      "宇宙",
      "灾变",
      "地下",
      "古老",
    ];

    const descriptions = [
      "附近所有已知生物惊恐逃窜",
      "现实本身出现裂缝",
      "成群的敌人蜂拥而出",
      "附近的植物枯萎凋零",
      "一位使者带着强大的遗物现身",
    ];

    const riftType = ra(types);
    const name = `${riftType}裂隙`;
    const legend = `传闻该区域存在一处${riftType.toLowerCase()}裂隙，正在导致${ra(
      descriptions
    )}。`;
    notes.push({ id, name, legend });
  }

  function listDisturbedBurial({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] >= 20 && cells.pop[i] > 2
    );
  }
  function addDisturbedBurial(id, cell) {
    const name = "被破坏的墓地";
    const legend =
      "该区域的一处墓地遭到了破坏，导致死者复活并攻击生者。";
    notes.push({ id, name, legend });
  }

  function listNecropolis({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] >= 20 && cells.pop[i] < 2
    );
  }

  function addNecropolis(id, cell) {
    const { cells } = pack;

    const toponym = Names.getCulture(cells.culture[cell]);
    const type = rw({
      大墓地: 5,
      地窖: 2,
      坟墓: 2,
      墓地: 1,
      公墓: 2,
      陵墓: 1,
      墓穴: 1,
    });

    const name = `${toponym}${type}`;
    const legend = ra([
      "一座笼罩在永恒黑暗中的阴森大墓地，诡异的低语在蜿蜒的走廊中回荡，幽灵守卫守护着被遗忘已久的灵魂的坟墓。",
      "一座高耸的大墓地，装饰着恐怖的雕塑，由强大的不死哨兵守卫。它古老的大厅里存放着堕落英雄的遗体，与他们珍视的遗物一同长眠。",
      "这座空灵的大墓地仿佛悬浮在生与死的世界之间。雾气在墓碑周围飘荡，萦绕心头的旋律在空中回荡，纪念着逝者。",
      "这座邪恶的大墓地从荒凉的土地上拔地而起，是死灵法术力量的见证。它那骷髅般的尖顶投下不祥的阴影，隐藏着禁忌的知识和神秘的秘密。",
      "一座阴森的大墓地，在这里自然与死亡交织。杂草丛生的墓碑被带刺的藤蔓缠绕，悲伤的灵魂在曾经鲜艳的花朵凋零的花瓣间徘徊。",
      "一座迷宫般的大墓地，每走一步都能听到令人毛骨悚然的低语。墙壁上装饰着古老的符文，躁动的灵魂引导或阻碍着那些敢于深入其中的人。",
      "这座被诅咒的大墓地笼罩在永恒的暮色中，弥漫着一种即将降临的厄运感。黑暗的魔法笼罩着坟墓，痛苦灵魂的呻吟在摇摇欲坠的大厅中回响。",
      "一座庞大的大墓地，建在迷宫般的地下墓穴网络中。它的大厅里排列着无数壁龛，每个壁龛都存放着逝者的遗体，远处传来骨头嘎嘎作响的声音。",
      "一座荒凉的大墓地，弥漫着一种诡异的寂静。时间似乎在腐朽的陵墓中凝固，只有风声的低语和破旧旗帜的沙沙声打破这份寂静。",
      "一座阴森的大墓地坐落在崎岖的悬崖顶上，俯瞰着一片荒芜的荒地。它高耸的城墙中隐藏着不安的灵魂，雄伟的大门上刻满了无数战斗和古老诅咒的痕迹。",
    ]);

    notes.push({ id, name, legend });
  }

  function listEncounters({ cells }) {
    return cells.i.filter(
      (i) => !occupied[i] && cells.h[i] >= 20 && cells.pop[i] > 1
    );
  }

  function addEncounter(id, cell) {
    const name = "随机遭遇";
    const encounterSeed = cell; // 仅使用单元格 ID，以免使 Vercel KV 数据库负担过重
    const legend = `<div>你遇到了一个角色。</div><iframe src="https://deorum.vercel.app/encounter/${encounterSeed}" width="375" height="600" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>`;
    notes.push({ id, name, legend });
  }

  return { add, generate, regenerate, getConfig, setConfig, deleteMarker };
})();
