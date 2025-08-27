"use strict";
// 用于存储通用UI函数的模块

window.addEventListener("resize", function (e) {
  if (stored("mapWidth") && stored("mapHeight")) return;
  mapWidthInput.value = window.innerWidth;
  mapHeightInput.value = window.innerHeight;
  fitMapToScreen();
});

if (location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
  window.onbeforeunload = () => "您确定要离开吗？";
}

// 工具提示
const tooltip = document.getElementById("tooltip");

// 为带有data-tip的非SVG元素显示提示
document.getElementById("dialogs").addEventListener("mousemove", showDataTip);
document
  .getElementById("optionsContainer")
  .addEventListener("mousemove", showDataTip);
document
  .getElementById("exitCustomization")
  .addEventListener("mousemove", showDataTip);

const tipBackgroundMap = {
  info: "linear-gradient(0.1turn, #ffffff00, #5e5c5c80, #ffffff00)",
  success: "linear-gradient(0.1turn, #ffffff00, #127912cc, #ffffff00)",
  warn: "linear-gradient(0.1turn, #ffffff00, #be5d08cc, #ffffff00)",
  error: "linear-gradient(0.1turn, #ffffff00, #e11d1dcc, #ffffff00)",
};

function tip(tip, main = false, type = "info", time = 0) {
  tooltip.innerHTML = tip;
  tooltip.style.background = tipBackgroundMap[type];

  if (main) {
    tooltip.dataset.main = tip;
    tooltip.dataset.color = tooltip.style.background;
  }
  if (time) setTimeout(clearMainTip, time);
}

function showMainTip() {
  tooltip.style.background = tooltip.dataset.color;
  tooltip.innerHTML = tooltip.dataset.main;
}

function clearMainTip() {
  tooltip.dataset.color = "";
  tooltip.dataset.main = "";
  tooltip.innerHTML = "";
}

// 在屏幕底部显示提示（考虑可能的翻译）
function showDataTip(event) {
  if (!event.target) return;

  let dataTip = event.target.dataset.tip;
  if (!dataTip && event.target.parentNode.dataset.tip)
    dataTip = event.target.parentNode.dataset.tip;
  if (!dataTip) return;

  const shortcut = event.target.dataset.shortcut;
  if (shortcut && !MOBILE) dataTip += `。快捷键：${shortcut}`;

  tip(dataTip);
}

function showElementLockTip(event) {
  const locked = event?.target?.classList?.contains("icon-lock");
  if (locked) {
    tip("已锁定。点击解锁该元素，允许再生工具对其进行修改");
  } else {
    tip("未锁定。点击锁定该元素，防止再生工具对其进行修改");
  }
}

const onMouseMove = debounce(handleMouseMove, 100);
function handleMouseMove() {
  const point = d3.mouse(this);
  const i = findCell(point[0], point[1]); // 数据包单元格ID
  if (i === undefined) return;

  showNotes(d3.event);
  const gridCell = findGridCell(point[0], point[1], grid);
  if (tooltip.dataset.main) showMainTip();
  else showMapTooltip(point, d3.event, i, gridCell);
  if (cellInfo?.offsetParent) updateCellInfo(point, i, gridCell);
}

let currentNoteId = null; // 存储当前显示的节点，避免过于频繁地重新渲染

// 鼠标悬停时显示注释框（如果有的话）
function showNotes(e) {
  if (notesEditor?.offsetParent) return;
  let id =
    e.target.id || e.target.parentNode.id || e.target.parentNode.parentNode.id;
  if (e.target.parentNode.parentNode.id === "burgLabels")
    id = "burg" + e.target.dataset.id;
  else if (e.target.parentNode.parentNode.id === "burgIcons")
    id = "burg" + e.target.dataset.id;

  const note = notes.find((note) => note.id === id);
  if (note !== undefined && note.legend !== "") {
    if (currentNoteId === id) return;
    currentNoteId = id;

    document.getElementById("notes").style.display = "block";
    document.getElementById("notesHeader").innerHTML = note.name;
    document.getElementById("notesBody").innerHTML = note.legend;
  } else if (!options.pinNotes && !markerEditor?.offsetParent && !e.shiftKey) {
    document.getElementById("notes").style.display = "none";
    document.getElementById("notesHeader").innerHTML = "";
    document.getElementById("notesBody").innerHTML = "";
    currentNoteId = null;
  }
}

// 如果主提示为空，则显示视图框提示
function showMapTooltip(point, e, i, g) {
  tip(""); // 清除提示
  const path = e.composedPath ? e.composedPath() : getComposedPath(e.target); // 应用polyfill
  if (!path[path.length - 8]) return;
  const group = path[path.length - 7].id;
  const subgroup = path[path.length - 8].id;
  const land = pack.cells.h[i] >= 20;

  // 特定元素
  if (group === "armies")
    return tip(e.target.parentNode.dataset.name + "。点击可编辑");

  if (group === "emblems" && e.target.tagName === "use") {
    const parent = e.target.parentNode;
    const [g, type] =
      parent.id === "burgEmblems"
        ? [pack.burgs, "城镇"]
        : parent.id === "provinceEmblems"
        ? [pack.provinces, "省份"]
        : [pack.states, "国家"];
    const i = +e.target.dataset.i;
    if (event.shiftKey) highlightEmblemElement(type, g[i]);

    d3.select(e.target).raise();
    d3.select(parent).raise();

    const name = g[i].fullName || g[i].name;
    tip(`${name} ${type}徽标。点击可编辑。按住Shift键可显示相关区域或地点`);
    return;
  }

  if (group === "rivers") {
    const river = +e.target.id.slice(5);
    const r = pack.rivers.find((r) => r.i === river);
    const name = r ? r.name + " " + r.type : "";
    tip(name + "。点击可编辑");
    if (riversOverview?.offsetParent)
      highlightEditorLine(riversOverview, river, 5000);
    return;
  }

  if (group === "routes") {
    const routeId = +e.target.id.slice(5);
    const route = pack.routes.find((route) => route.i === routeId);
    if (route) {
      if (route.name) return tip(`${route.name}。点击可编辑路线`);
      return tip("点击可编辑路线");
    }
  }

  if (group === "terrain") return tip("点击可编辑地形图标");

  if (subgroup === "burgLabels" || subgroup === "burgIcons") {
    const burgId = +path[path.length - 10].dataset.id;
    if (burgId) {
      const burg = pack.burgs[burgId];
      const population = si(burg.population * populationRate * urbanization);
      tip(`${burg.name}。人口：${population}。点击可编辑`);
      if (burgsOverview?.offsetParent)
        highlightEditorLine(burgsOverview, burgId, 5000);
      return;
    }
  }

  if (group === "labels") return tip("点击可编辑标签");

  if (group === "markers")
    return tip("点击可编辑标记。按住Shift键不会关闭相关注释");

  if (group === "ruler") {
    const tag = e.target.tagName;
    const className = e.target.getAttribute("class");
    if (tag === "circle" && className === "edge")
      return tip("拖动可调整。按住Ctrl键并拖动可添加点。点击可删除点");
    if (tag === "circle" && className === "control")
      return tip("拖动可调整。按住Shift键并拖动可保持轴向。点击可删除点");
    if (tag === "circle") return tip("拖动可调整测量工具");
    if (tag === "polyline") return tip("点击并拖动可添加控制点");
    if (tag === "path") return tip("拖动可移动测量工具");
    if (tag === "text") return tip("拖动可移动，点击可删除测量工具");
  }

  if (subgroup === "burgIcons") return tip("点击可编辑城镇");

  if (subgroup === "burgLabels") return tip("点击可编辑城镇");

  if (group === "lakes" && !land) {
    const lakeId = +e.target.dataset.f;
    const name = pack.features[lakeId]?.name;
    const fullName = subgroup === "freshwater" ? name : name + " " + subgroup;
    tip(`${fullName}湖。点击可编辑`);
    return;
  }
  if (group === "coastline") return tip("点击可编辑海岸线");

  if (group === "zones") {
    const element = path[path.length - 8];
    const zoneId = +element.dataset.id;
    const zone = pack.zones.find((zone) => zone.i === zoneId);
    tip(zone.name);
    if (zonesEditor?.offsetParent)
      highlightEditorLine(zonesEditor, zoneId, 5000);
    return;
  }

  if (group === "ice") return tip("点击可编辑冰层");

  // 覆盖元素
  if (layerIsOn("togglePrecipitation") && land)
    tip("年降水量：" + getFriendlyPrecipitation(i));
  else if (layerIsOn("togglePopulation")) tip(getPopulationTip(i));
  else if (layerIsOn("toggleTemperature"))
    tip("温度：" + convertTemperature(grid.cells.temp[g]));
  else if (layerIsOn("toggleBiomes") && pack.cells.biome[i]) {
    const biome = pack.cells.biome[i];
    tip("生物群系：" + biomesData.name[biome]);
    if (biomesEditor?.offsetParent) highlightEditorLine(biomesEditor, biome);
  } else if (layerIsOn("toggleReligions") && pack.cells.religion[i]) {
    const religion = pack.cells.religion[i];
    const r = pack.religions[religion];
    const type =
      r.type === "教派" || r.type == "异端" ? r.type : r.type + "宗教";
    tip(type + "：" + r.name);
    if (byId("religionsEditor")?.offsetParent)
      highlightEditorLine(religionsEditor, religion);
  } else if (
    pack.cells.state[i] &&
    (layerIsOn("toggleProvinces") || layerIsOn("toggleStates"))
  ) {
    const state = pack.cells.state[i];
    const stateName = pack.states[state].fullName;
    const province = pack.cells.province[i];
    const prov = province ? pack.provinces[province].fullName + "，" : "";
    tip(prov + stateName);
    if (document.getElementById("statesEditor")?.offsetParent)
      highlightEditorLine(statesEditor, state);
    if (document.getElementById("diplomacyEditor")?.offsetParent)
      highlightEditorLine(diplomacyEditor, state);
    if (document.getElementById("militaryOverview")?.offsetParent)
      highlightEditorLine(militaryOverview, state);
    if (document.getElementById("provincesEditor")?.offsetParent)
      highlightEditorLine(provincesEditor, province);
  } else if (layerIsOn("toggleCultures") && pack.cells.culture[i]) {
    const culture = pack.cells.culture[i];
    tip("文化：" + pack.cultures[culture].name);
    if (document.getElementById("culturesEditor")?.offsetParent)
      highlightEditorLine(culturesEditor, culture);
  } else if (layerIsOn("toggleHeight"))
    tip("高度：" + getFriendlyHeight(point));
}

function highlightEditorLine(editor, id, timeout = 10000) {
  Array.from(editor.getElementsByClassName("states hovered")).forEach((el) =>
    el.classList.remove("hovered")
  ); // 清除所有hovered类
  const hovered = Array.from(editor.querySelectorAll("div")).find(
    (el) => el.dataset.id == id
  );
  if (hovered) hovered.classList.add("hovered"); // 添加hovered类
  if (timeout)
    setTimeout(() => {
      hovered && hovered.classList.remove("hovered");
    }, timeout);
}

// 鼠标移动时获取单元格信息
function updateCellInfo(point, i, g) {
  const cells = pack.cells;
  const x = (infoX.innerHTML = rn(point[0]));
  const y = (infoY.innerHTML = rn(point[1]));
  const f = cells.f[i];
  infoLat.innerHTML = toDMS(getLatitude(y, 4), "lat");
  infoLon.innerHTML = toDMS(getLongitude(x, 4), "lon");
  infoGeozone.innerHTML = getGeozone(getLatitude(y, 4));

  infoCell.innerHTML = i;
  infoArea.innerHTML = cells.area[i]
    ? si(getArea(cells.area[i])) + " " + getAreaUnit()
    : "无数据";
  infoElevation.innerHTML = getElevation(pack.features[f], pack.cells.h[i]);
  infoDepth.innerHTML = getDepth(pack.features[f], point);
  infoTemp.innerHTML = convertTemperature(grid.cells.temp[g]);
  infoPrec.innerHTML =
    cells.h[i] >= 20 ? getFriendlyPrecipitation(i) : "无数据";
  infoRiver.innerHTML =
    cells.h[i] >= 20 && cells.r[i] ? getRiverInfo(cells.r[i]) : "无";
  infoState.innerHTML =
    cells.h[i] >= 20
      ? cells.state[i]
        ? `${pack.states[cells.state[i]].fullName}（${cells.state[i]}）`
        : "中立地区（0）"
      : "无";
  infoProvince.innerHTML = cells.province[i]
    ? `${pack.provinces[cells.province[i]].fullName}（${cells.province[i]}）`
    : "无";
  infoCulture.innerHTML = cells.culture[i]
    ? `${pack.cultures[cells.culture[i]].name}（${cells.culture[i]}）`
    : "无";
  infoReligion.innerHTML = cells.religion[i]
    ? `${pack.religions[cells.religion[i]].name}（${cells.religion[i]}）`
    : "无";
  infoPopulation.innerHTML = getFriendlyPopulation(i);
  infoBurg.innerHTML = cells.burg[i]
    ? pack.burgs[cells.burg[i]].name + "（" + cells.burg[i] + "）"
    : "无";
  infoFeature.innerHTML = f
    ? pack.features[f].group + "（" + f + "）"
    : "无数据";
  infoBiome.innerHTML = biomesData.name[cells.biome[i]];
}

function getGeozone(latitude) {
  if (latitude > 66.5) return "北极地区";
  if (latitude > 35) return "北温带";
  if (latitude > 23.5) return "北亚热带";
  if (latitude > 1) return "北热带";
  if (latitude > -1) return "赤道地区";
  if (latitude > -23.5) return "南热带";
  if (latitude > -35) return "南亚热带";
  if (latitude > -66.5) return "南温带";
  return "南极地区";
}

// 将坐标转换为度分秒格式
function toDMS(coord, c) {
  const degrees = Math.floor(Math.abs(coord));
  const minutesNotTruncated = (Math.abs(coord) - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
  const cardinal =
    c === "lat" ? (coord >= 0 ? "北纬" : "南纬") : coord >= 0 ? "东经" : "西经";
  return degrees + "°" + minutes + "′" + seconds + "″" + cardinal;
}

// 获取地表海拔
function getElevation(f, h) {
  if (f.land) return getHeight(h) + "（" + h + "）"; // 陆地：常规高度
  if (f.border) return "0 " + heightUnit.value; // 海洋：0
  if (f.type === "lake") return getHeight(f.height) + "（" + f.height + "）"; // 湖泊：在河流生成时定义
}

// 获取水深
function getDepth(f, p) {
  if (f.land) return "0 " + heightUnit.value; // 陆地：0

  // 湖泊：表面与底部的差值
  const gridH = grid.cells.h[findGridCell(p[0], p[1], grid)];
  if (f.type === "lake") {
    const depth = gridH === 19 ? f.height / 2 : gridH;
    return getHeight(depth, "abs");
  }

  return getHeight(gridH, "abs"); // 海洋：网格高度
}

// 从地图数据中获取用户友好的（现实世界的）高度值
function getFriendlyHeight([x, y]) {
  const packH = pack.cells.h[findCell(x, y)];
  const gridH = grid.cells.h[findGridCell(x, y, grid)];
  const h = packH < 20 ? gridH : packH;
  return getHeight(h);
}

function getHeight(h, abs) {
  const unit = heightUnit.value;
  let unitRatio = 3.281; // 默认以英尺计算
  if (unit === "m") unitRatio = 1; // 如果是米
  else if (unit === "f") unitRatio = 0.5468; // 如果是英寻

  let height = -990;
  if (h >= 20) height = Math.pow(h - 18, +heightExponentInput.value);
  else if (h < 20 && h > 0) height = ((h - 20) / h) * 50;

  if (abs) height = Math.abs(height);
  return rn(height * unitRatio) + " " + unit;
}

function getPrecipitation(prec) {
  return prec * 100 + " 毫米";
}

// 从地图数据中获取用户友好的（现实世界的）降水量值
function getFriendlyPrecipitation(i) {
  const prec = grid.cells.prec[pack.cells.g[i]];
  return getPrecipitation(prec);
}

function getRiverInfo(id) {
  const r = pack.rivers.find((r) => r.i == id);
  return r ? `${r.name} ${r.type}（${id}）` : "无数据";
}

function getCellPopulation(i) {
  const rural = pack.cells.pop[i] * populationRate;
  const urban = pack.cells.burg[i]
    ? pack.burgs[pack.cells.burg[i]].population * populationRate * urbanization
    : 0;
  return [rural, urban];
}

// 从地图数据中获取用户友好的（现实世界的）人口值
function getFriendlyPopulation(i) {
  const [rural, urban] = getCellPopulation(i);
  return `${si(rural + urban)}（农村：${si(rural)}，城市：${si(urban)}）`;
}

function getPopulationTip(i) {
  const [rural, urban] = getCellPopulation(i);
  return `单元格人口：${si(rural + urban)}；农村：${si(rural)}；城市：${si(
    urban
  )}`;
}

function highlightEmblemElement(type, el) {
  const i = el.i,
    cells = pack.cells;
  const animation = d3.transition().duration(1000).ease(d3.easeSinIn);

  if (type === "burg") {
    const { x, y } = el;
    debug
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 0)
      .attr("fill", "none")
      .attr("stroke", "#d0240f")
      .attr("stroke-width", 1)
      .attr("opacity", 1)
      .transition(animation)
      .attr("r", 20)
      .attr("opacity", 0.1)
      .attr("stroke-width", 0)
      .remove();
    return;
  }

  const [x, y] = el.pole || pack.cells.p[el.center];
  const obj = type === "state" ? cells.state : cells.province;
  const borderCells = cells.i.filter(
    (id) => obj[id] === i && cells.c[id].some((n) => obj[n] !== i)
  );
  const data = Array.from(borderCells)
    .filter((c, i) => !(i % 2))
    .map((i) => cells.p[i])
    .map((i) => [i[0], i[1], Math.hypot(i[0] - x, i[1] - y)]);

  debug
    .selectAll("line")
    .data(data)
    .enter()
    .append("line")
    .attr("x1", x)
    .attr("y1", y)
    .attr("x2", (d) => d[0])
    .attr("y2", (d) => d[1])
    .attr("stroke", "#d0240f")
    .attr("stroke-width", 0.5)
    .attr("opacity", 0.2)
    .attr("stroke-dashoffset", (d) => d[2])
    .attr("stroke-dasharray", (d) => d[2])
    .transition(animation)
    .attr("stroke-dashoffset", 0)
    .attr("opacity", 1)
    .transition(animation)
    .delay(1000)
    .attr("stroke-dashoffset", (d) => d[2])
    .attr("opacity", 0)
    .remove();
}

// 分配锁定行为
document.querySelectorAll("[data-locked]").forEach(function (e) {
  e.addEventListener("mouseover", function (e) {
    e.stopPropagation();
    if (this.className === "icon-lock")
      tip("点击解锁该选项，允许在新地图生成时随机化");
    else tip("点击锁定该选项，在新地图生成时始终使用当前值");
  });

  e.addEventListener("click", function () {
    const ids = this.dataset.ids
      ? this.dataset.ids.split(",")
      : [this.id.slice(5)];
    const fn = this.className === "icon-lock" ? unlock : lock;
    ids.forEach(fn);
  });
});

// 锁定选项
function lock(id) {
  const input = document.querySelector('[data-stored="' + id + '"]');
  if (input) store(id, input.value);
  const el = document.getElementById("lock_" + id);
  if (!el) return;
  el.dataset.locked = 1;
  el.className = "icon-lock";
}

// 解锁选项
function unlock(id) {
  localStorage.removeItem(id);
  const el = document.getElementById("lock_" + id);
  if (!el) return;
  el.dataset.locked = 0;
  el.className = "icon-lock-open";
}

// 检查选项是否已锁定
function locked(id) {
  const lockEl = document.getElementById("lock_" + id);
  return lockEl.dataset.locked === "1";
}

// 返回存储在localStorage中的键值，或null
function stored(key) {
  return localStorage.getItem(key) || null;
}

// 将键值存储在localStorage中
function store(key, value) {
  return localStorage.setItem(key, value);
}

// 分配扬声器行为
Array.from(document.getElementsByClassName("speaker")).forEach((el) => {
  const input = el.previousElementSibling;
  el.addEventListener("click", () => speak(input.value));
});

function speak(text) {
  const speaker = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  if (voices.length) {
    const voiceId = +document.getElementById("speakerVoice").value;
    speaker.voice = voices[voiceId];
  }
  speechSynthesis.speak(speaker);
}

// 应用下拉菜单选项。如果值不在选项中，则添加它
function applyOption($select, value, name = value) {
  const isExisting = Array.from($select.options).some((o) => o.value === value);
  if (!isExisting) $select.options.add(new Option(name, value));
  $select.value = value;
}

// 在弹出窗口中显示生成器信息
function showInfo() {
  const Discord = link("https://discordapp.com/invite/X7E84HU", "Discord");
  const Reddit = link("https://www.reddit.com/r/FantasyMapGenerator", "Reddit");
  const Patreon = link("https://www.patreon.com/azgaar", "Patreon");
  const Armoria = link("https://azgaar.github.io/Armoria", "Armoria");
  const Deorum = link("https://deorum.vercel.app", "Deorum");

  const QuickStart = link(
    "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Quick-Start-Tutorial",
    "快速入门教程"
  );
  const QAA = link(
    "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Q&A",
    "问答页面"
  );
  const VideoTutorial = link(
    "https://youtube.com/playlist?list=PLtgiuDC8iVR2gIG8zMTRn7T_L0arl9h1C",
    "视频教程"
  );

  alertMessage.innerHTML = /* html */ `<h2>关于此汉化版</h2>
          <p>原版作者：Azgaar</p>
          <p>
            该版本 fork 自
            <a href="https://github.com/Azgaar/Fantasy-Map-Generator"
              >原作者开源项目</a
            >，遵循<a
              href="https://github.com/Azgaar/Fantasy-Map-Generator/blob/master/LICENSE"
              >MIT License</a
            >，仅对原版进行汉化。如存在功能性
            Bug，请向原作者反馈。
          </p>
  <h2>原版描述</h2>
  <b>幻想地图生成器</b>（FMG）是一款免费的开源应用程序。这意味着您拥有所有创建的地图，并可以按您的意愿使用它们。

    <p>
      开发由社区支持，您可以在${Patreon}上捐赠。您也可以帮助创建概述、教程并宣传这款生成器。
    </p>

    <p>
      获取帮助的最佳方式是在${Discord}和${Reddit}上联系社区。提问前，请查看${QuickStart}、${QAA}
      和${VideoTutorial}。
    </p>

    <ul style="columns:2">
      <li>${link(
        "https://github.com/Azgaar/Fantasy-Map-Generator",
        "GitHub仓库"
      )}</li>
      <li>${link(
        "https://github.com/Azgaar/Fantasy-Map-Generator/blob/master/LICENSE",
        "许可证"
      )}</li>
      <li>${link(
        "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Changelog",
        "更新日志"
      )}</li>
      <li>${link(
        "https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Hotkeys",
        "快捷键"
      )}</li>
      <li>${link(
        "https://trello.com/b/7x832DG4/fantasy-map-generator",
        "开发板"
      )}</li>
      <li><a href="mailto:azgaar.fmg@yandex.by" target="_blank">联系Azgaar</a></li>
    </ul>
    
    <p>查看我们的其他项目：
      <ul>
        <li>${Armoria}：一款用于创建纹章的工具</li>
        <li>${Deorum}：一个庞大的可定制幻想角色图库</li>
      </ul>
    </p>
    
    <p>其他汉化版本：<a href="https://www.8desk.top" target="_blank">8desk.top</a></p>`;

  $("#alert").dialog({
    resizable: false,
    title: document.title,
    width: "28em",
    buttons: {
      确定: function () {
        $(this).dialog("close");
      },
    },
    position: { my: "center", at: "center", of: "svg" },
  });
}
