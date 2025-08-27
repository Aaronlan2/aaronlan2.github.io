const ROUTES_SHARP_ANGLE = 135; // 路线锐角角度
const ROUTES_VERY_SHARP_ANGLE = 115; // 路线极锐角角度

const MIN_PASSABLE_SEA_TEMP = -4; // 可通行海域的最低温度
const ROUTE_TYPE_MODIFIERS = {
  "-1": 1, // 海岸线
  "-2": 1.8, // 近海
  "-3": 4, // 远海
  "-4": 6, // 大洋
  default: 8 // 远洋
};

window.Routes = (function () {
  function generate(lockedRoutes = []) {
    const {capitalsByFeature, burgsByFeature, portsByFeature} = sortBurgsByFeature(pack.burgs);

    const connections = new Map();
    lockedRoutes.forEach(route => addConnections(route.points.map(p => p[2])));

    const mainRoads = generateMainRoads();
    const trails = generateTrails();
    const seaRoutes = generateSeaRoutes();

    pack.routes = createRoutesData(lockedRoutes);
    pack.cells.routes = buildLinks(pack.routes);

    function sortBurgsByFeature(burgs) {
      const burgsByFeature = {};
      const capitalsByFeature = {};
      const portsByFeature = {};

      const addBurg = (object, feature, burg) => {
        if (!object[feature]) object[feature] = [];
        object[feature].push(burg);
      };

      for (const burg of burgs) {
        if (burg.i && !burg.removed) {
          const {feature, capital, port} = burg;
          addBurg(burgsByFeature, feature, burg);
          if (capital) addBurg(capitalsByFeature, feature, burg);
          if (port) addBurg(portsByFeature, port, burg);
        }
      }

      return {burgsByFeature, capitalsByFeature, portsByFeature};
    }

    function generateMainRoads() {
      TIME && console.time("生成主要道路");
      const mainRoads = [];

      for (const [key, featureCapitals] of Object.entries(capitalsByFeature)) {
        const points = featureCapitals.map(burg => [burg.x, burg.y]);
        const urquhartEdges = calculateUrquhartEdges(points);
        urquhartEdges.forEach(([fromId, toId]) => {
          const start = featureCapitals[fromId].cell;
          const exit = featureCapitals[toId].cell;

          const segments = findPathSegments({isWater: false, connections, start, exit});
          for (const segment of segments) {
            addConnections(segment);
            mainRoads.push({feature: Number(key), cells: segment});
          }
        });
      }

      TIME && console.timeEnd("生成主要道路");
      return mainRoads;
    }

    function generateTrails() {
      TIME && console.time("生成小径");
      const trails = [];

      for (const [key, featureBurgs] of Object.entries(burgsByFeature)) {
        const points = featureBurgs.map(burg => [burg.x, burg.y]);
        const urquhartEdges = calculateUrquhartEdges(points);
        urquhartEdges.forEach(([fromId, toId]) => {
          const start = featureBurgs[fromId].cell;
          const exit = featureBurgs[toId].cell;

          const segments = findPathSegments({isWater: false, connections, start, exit});
          for (const segment of segments) {
            addConnections(segment);
            trails.push({feature: Number(key), cells: segment});
          }
        });
      }

      TIME && console.timeEnd("生成小径");
      return trails;
    }

    function generateSeaRoutes() {
      TIME && console.time("生成海上路线");
      const seaRoutes = [];

      for (const [featureId, featurePorts] of Object.entries(portsByFeature)) {
        const points = featurePorts.map(burg => [burg.x, burg.y]);
        const urquhartEdges = calculateUrquhartEdges(points);

        urquhartEdges.forEach(([fromId, toId]) => {
          const start = featurePorts[fromId].cell;
          const exit = featurePorts[toId].cell;
          const segments = findPathSegments({isWater: true, connections, start, exit});
          for (const segment of segments) {
            addConnections(segment);
            seaRoutes.push({feature: Number(featureId), cells: segment});
          }
        });
      }

      TIME && console.timeEnd("生成海上路线");
      return seaRoutes;
    }

    function addConnections(segment) {
      for (let i = 0; i < segment.length; i++) {
        const cellId = segment[i];
        const nextCellId = segment[i + 1];
        if (nextCellId) {
          connections.set(`${cellId}-${nextCellId}`, true);
          connections.set(`${nextCellId}-${cellId}`, true);
        }
      }
    }

    function findPathSegments({isWater, connections, start, exit}) {
      const getCost = createCostEvaluator({isWater, connections});
      const pathCells = findPath(start, current => current === exit, getCost);
      if (!pathCells) return [];
      const segments = getRouteSegments(pathCells, connections);
      return segments;
    }

    function createRoutesData(routes) {
      const pointsArray = preparePointsArray();

      for (const {feature, cells, merged} of mergeRoutes(mainRoads)) {
        if (merged) continue;
        const points = getPoints("roads", cells, pointsArray);
        routes.push({i: routes.length, group: "roads", feature, points});
      }

      for (const {feature, cells, merged} of mergeRoutes(trails)) {
        if (merged) continue;
        const points = getPoints("trails", cells, pointsArray);
        routes.push({i: routes.length, group: "trails", feature, points});
      }

      for (const {feature, cells, merged} of mergeRoutes(seaRoutes)) {
        if (merged) continue;
        const points = getPoints("searoutes", cells, pointsArray);
        routes.push({i: routes.length, group: "searoutes", feature, points});
      }

      return routes;
    }

    // 合并路线：将一条路线的最后一个单元格与另一条路线的第一个单元格相连
    function mergeRoutes(routes) {
      let routesMerged = 0;

      for (let i = 0; i < routes.length; i++) {
        const thisRoute = routes[i];
        if (thisRoute.merged) continue;

        for (let j = i + 1; j < routes.length; j++) {
          const nextRoute = routes[j];
          if (nextRoute.merged) continue;

          if (nextRoute.cells.at(0) === thisRoute.cells.at(-1)) {
            routesMerged++;
            thisRoute.cells = thisRoute.cells.concat(nextRoute.cells.slice(1));
            nextRoute.merged = true;
          }
        }
      }

      return routesMerged > 1 ? mergeRoutes(routes) : routes;
    }
  }

  function createCostEvaluator({isWater, connections}) {
    return isWater ? getWaterPathCost : getLandPathCost;

    function getLandPathCost(current, next) {
      if (pack.cells.h[next] < 20) return Infinity; // 忽略水域单元格

      const habitability = biomesData.habitability[pack.cells.biome[next]];
      if (!habitability) return Infinity; // 不可居住的单元格无法通行（如冰川）

      const distanceCost = dist2(pack.cells.p[current], pack.cells.p[next]);
      const habitabilityModifier = 1 + Math.max(100 - habitability, 0) / 1000; // [1, 1.1]
      const heightModifier = 1 + Math.max(pack.cells.h[next] - 25, 25) / 25; // [1, 3]
      const connectionModifier = connections.has(`${current}-${next}`) ? 0.5 : 1;
      const burgModifier = pack.cells.burg[next] ? 1 : 3;

      const pathCost = distanceCost * habitabilityModifier * heightModifier * connectionModifier * burgModifier;
      return pathCost;
    }

    function getWaterPathCost(current, next) {
      if (pack.cells.h[next] >= 20) return Infinity; // 忽略陆地单元格
      if (grid.cells.temp[pack.cells.g[next]] < MIN_PASSABLE_SEA_TEMP) return Infinity; // 忽略过冷的单元格

      const distanceCost = dist2(pack.cells.p[current], pack.cells.p[next]);
      const typeModifier = ROUTE_TYPE_MODIFIERS[pack.cells.t[next]] || ROUTE_TYPE_MODIFIERS.default;
      const connectionModifier = connections.has(`${current}-${next}`) ? 0.5 : 1;

      const pathCost = distanceCost * typeModifier * connectionModifier;
      return pathCost;
    }
  }

  function buildLinks(routes) {
    const links = {};

    for (const {points, i: routeId} of routes) {
      const cells = points.map(p => p[2]);

      for (let i = 0; i < cells.length - 1; i++) {
        const cellId = cells[i];
        const nextCellId = cells[i + 1];

        if (cellId !== nextCellId) {
          if (!links[cellId]) links[cellId] = {};
          links[cellId][nextCellId] = routeId;

          if (!links[nextCellId]) links[nextCellId] = {};
          links[nextCellId][cellId] = routeId;
        }
      }
    }

    return links;
  }

  function preparePointsArray() {
    const {cells, burgs} = pack;
    return cells.p.map(([x, y], cellId) => {
      const burgId = cells.burg[cellId];
      if (burgId) return [burgs[burgId].x, burgs[burgId].y];
      return [x, y];
    });
  }

  function getPoints(group, cells, points) {
    const data = cells.map(cellId => [...points[cellId], cellId]);

    // 处理锐角
    if (group !== "searoutes") {
      for (let i = 1; i < cells.length - 1; i++) {
        const cellId = cells[i];
        if (pack.cells.burg[cellId]) continue;

        const [prevX, prevY] = data[i - 1];
        const [currX, currY] = data[i];
        const [nextX, nextY] = data[i + 1];

        const dAx = prevX - currX;
        const dAy = prevY - currY;
        const dBx = nextX - currX;
        const dBy = nextY - currY;
        const angle = Math.abs((Math.atan2(dAx * dBy - dAy * dBx, dAx * dBx + dAy * dBy) * 180) / Math.PI);

        if (angle < ROUTES_SHARP_ANGLE) {
          const middleX = (prevX + nextX) / 2;
          const middleY = (prevY + nextY) / 2;
          let newX, newY;

          if (angle < ROUTES_VERY_SHARP_ANGLE) {
            newX = rn((currX + middleX * 2) / 3, 2);
            newY = rn((currY + middleY * 2) / 3, 2);
          } else {
            newX = rn((currX + middleX) / 2, 2);
            newY = rn((currY + middleY) / 2, 2);
          }

          if (findCell(newX, newY) === cellId) {
            data[i] = [newX, newY, cellId];
            points[cellId] = [data[i][0], data[i][1]]; // 为所有路线修改单元格坐标
          }
        }
      }
    }

    return data; // [[x, y, 单元格], [x, y, 单元格]]
  }

  function getRouteSegments(pathCells, connections) {
    const segments = [];
    let segment = [];

    for (let i = 0; i < pathCells.length; i++) {
      const cellId = pathCells[i];
      const nextCellId = pathCells[i + 1];
      const isConnected = connections.has(`${cellId}-${nextCellId}`) || connections.has(`${nextCellId}-${cellId}`);

      if (isConnected) {
        if (segment.length) {
          // 路段接入已有路段
          segment.push(pathCells[i]);
          segments.push(segment);
          segment = [];
        }
        continue;
      }

      segment.push(pathCells[i]);
    }

    if (segment.length > 1) segments.push(segment);

    return segments;
  }

  // 厄克特图通过移除德劳内三角剖分中每个三角形的最长边获得
  // 这为我们提供了理想道路网络的近似值，即城镇之间的连接
  // 代码来自 https://observablehq.com/@mbostock/urquhart-graph
  function calculateUrquhartEdges(points) {
    const score = (p0, p1) => dist2(points[p0], points[p1]);

    const {halfedges, triangles} = Delaunator.from(points);
    const n = triangles.length;

    const removed = new Uint8Array(n);
    const edges = [];

    for (let e = 0; e < n; e += 3) {
      const p0 = triangles[e],
        p1 = triangles[e + 1],
        p2 = triangles[e + 2];

      const p01 = score(p0, p1),
        p12 = score(p1, p2),
        p20 = score(p2, p0);

      removed[
        p20 > p01 && p20 > p12
          ? Math.max(e + 2, halfedges[e + 2])
          : p12 > p01 && p12 > p20
          ? Math.max(e + 1, halfedges[e + 1])
          : Math.max(e, halfedges[e])
      ] = 1;
    }

    for (let e = 0; e < n; ++e) {
      if (e > halfedges[e] && !removed[e]) {
        const t0 = triangles[e];
        const t1 = triangles[e % 3 === 2 ? e - 2 : e + 1];
        edges.push([t0, t1]);
      }
    }

    return edges;
  }

  // 通过陆地将单元格与路线系统连接
  function connect(cellId) {
    const getCost = createCostEvaluator({isWater: false, connections: new Map()});
    const pathCells = findPath(cellId, isConnected, getCost);
    if (!pathCells) return;

    const pointsArray = preparePointsArray();
    const points = getPoints("trails", pathCells, pointsArray);
    const feature = pack.cells.f[cellId];
    const routeId = getNextId();
    const newRoute = {i: routeId, group: "trails", feature, points};
    pack.routes.push(newRoute);

    for (let i = 0; i < pathCells.length; i++) {
      const cellId = pathCells[i];
      const nextCellId = pathCells[i + 1];
      if (nextCellId) addConnection(cellId, nextCellId, routeId);
    }

    return newRoute;

    function addConnection(from, to, routeId) {
      const routes = pack.cells.routes;

      if (!routes[from]) routes[from] = {};
      routes[from][to] = routeId;

      if (!routes[to]) routes[to] = {};
      routes[to][from] = routeId;
    }
  }

  // 工具函数
  function isConnected(cellId) {
    const routes = pack.cells.routes;
    return routes[cellId] && Object.keys(routes[cellId]).length > 0;
  }

  function areConnected(from, to) {
    const routeId = pack.cells.routes[from]?.[to];
    return routeId !== undefined;
  }

  function getRoute(from, to) {
    const routeId = pack.cells.routes[from]?.[to];
    if (routeId === undefined) return null;

    const route = pack.routes.find(route => route.i === routeId);
    if (!route) return null;

    return route;
  }

  function hasRoad(cellId) {
    const connections = pack.cells.routes[cellId];
    if (!connections) return false;

    return Object.values(connections).some(routeId => {
      const route = pack.routes.find(route => route.i === routeId);
      if (!route) return false;
      return route.group === "roads";
    });
  }

  function isCrossroad(cellId) {
    const connections = pack.cells.routes[cellId];
    if (!connections) return false;
    if (Object.keys(connections).length > 3) return true;
    const roadConnections = Object.values(connections).filter(routeId => {
      const route = pack.routes.find(route => route.i === routeId);
      return route?.group === "roads";
    });
    return roadConnections.length > 2;
  }

  // 名称生成器数据
  const models = {
    roads: {"城镇 + 后缀": 3, "前缀 + 后缀": 6, "描述词 + 前缀 + 后缀": 2, 定冠词描述词城镇后缀: 1},
    trails: {"城镇 + 后缀": 8, "前缀 + 后缀": 1, 定冠词描述词城镇后缀: 1},
    searoutes: {"城镇 + 后缀": 4, "前缀 + 后缀": 2, "描述词 + 前缀 + 后缀": 1}
  };

  const prefixes = [
    "国王", "女王", "军事", "古老", "新", "远古", "皇家", "帝国", "伟大", "宏大",
    "高级", "白银", "巨龙", "暗影", "星辰", "神秘", "低语", "雄鹰", "黄金", "水晶",
    "魔法", "寒霜", "月亮", "太阳", "雷霆", "凤凰", "蓝宝石", "天体", "漫游", "回声",
    "黄昏", "深红", "巨蛇", "钢铁", "森林", "花朵", "低语", "永恒", "冰封", "雨水",
    "光辉", "星尘", "奥秘", "闪光", "翡翠", "余烬", "蔚蓝", "镀金", "神圣", "暗影",
    "诅咒", "月光", "黑貂", "永恒", "琥珀", "茄属", "幽灵", "猩红", "铂金", "旋风",
    "黑曜石", "空灵", "鬼魂", "尖刺", "黄昏", "乌鸦", "幽灵", "燃烧", "翠绿", "铜色",
    "天鹅绒", "猎鹰", "谜", "发光", "镀银", "熔化", "辐射", "星际", "野生", "火焰",
    "紫水晶", "极光", "阴暗", "太阳", "月球", "微风", "褪色", "泰坦", "黎明", "水晶",
    "珠宝", "森林", "扭曲", "乌木", "荆棘", "蔚蓝", "宁静", "地狱", "风暴", "怪异",
    "蓝宝石", "深红", "宁静", "铺砌"
  ];

  const descriptors = [
    "伟大", "笼罩", "神圣", "传说", "霜冻", "蜿蜒", "回声", "蜿蜒如蛇", "微风",
    "迷雾", "乡村", "寂静", "鹅卵石", "裂纹", "摇晃", "模糊"
  ];

  const suffixes = {
    roads: {道路: 7, 路线: 3, 路径: 2, 高速公路: 1},
    trails: {小径: 4, 小道: 1, 轨道: 1, 关隘: 1},
    searoutes: {海上路线: 5, 航道: 2, 通道: 1, 海路: 1}
  };

  function generateName({group, points}) {
    if (points.length < 4) return "无名路线段";

    const model = rw(models[group]);
    const suffix = rw(suffixes[group]);

    const burgName = getBurgName();
    if (model === "城镇 + 后缀" && burgName) return `${burgName}${suffix}`;
    if (model === "前缀 + 后缀") return `${ra(prefixes)}${suffix}`;
    if (model === "描述词 + 前缀 + 后缀") return `${ra(descriptors)}${ra(prefixes)}${suffix}`;
    if (model === "描述词 + 城镇 + 后缀" && burgName) return `${ra(descriptors)}${burgName}${suffix}`;
    return "无名路线";

    function getBurgName() {
      const priority = [points.at(-1), points.at(0), points.slice(1, -1).reverse()];
      for (const [_x, _y, cellId] of priority) {
        const burgId = pack.cells.burg[cellId];
        if (burgId) return getAdjective(pack.burgs[burgId].name);
      }
      return null;
    }
  }

  const ROUTE_CURVES = {
    roads: d3.curveCatmullRom.alpha(0.1),
    trails: d3.curveCatmullRom.alpha(0.1),
    searoutes: d3.curveCatmullRom.alpha(0.5),
    default: d3.curveCatmullRom.alpha(0.1)
  };

  function getPath({group, points}) {
    const lineGen = d3.line();
    lineGen.curve(ROUTE_CURVES[group] || ROUTE_CURVES.default);
    const path = round(lineGen(points.map(p => [p[0], p[1]])), 1);
    return path;
  }

  function getLength(routeId) {
    const path = routes.select("#route" + routeId).node();
    return path.getTotalLength();
  }

  function getNextId() {
    return pack.routes.length ? Math.max(...pack.routes.map(r => r.i)) + 1 : 0;
  }

  function remove(route) {
    const routes = pack.cells.routes;

    for (const point of route.points) {
      const from = point[2];
      if (!routes[from]) continue;

      for (const [to, routeId] of Object.entries(routes[from])) {
        if (routeId === route.i) {
          delete routes[from][to];
          delete routes[to][from];
        }
      }
    }

    pack.routes = pack.routes.filter(r => r.i !== route.i);
    viewbox.select("#route" + route.i).remove();
  }

  return {
    generate,
    buildLinks,
    connect,
    isConnected,
    areConnected,
    getRoute,
    hasRoad,
    isCrossroad,
    generateName,
    getPath,
    getLength,
    getNextId,
    remove
  };
})();