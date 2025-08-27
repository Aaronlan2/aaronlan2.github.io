"use strict";

// functions to save the project to a file
async function saveMap(method) {
  if (customization) return tip("地图无法在编辑模式下保存，请完成编辑并重试", false, "error");
  closeDialogs("#alert");

  try {
    const mapData = prepareMapData();
    const filename = getFileName() + ".map";

    saveToStorage(mapData, method === "storage"); // any method saves to indexedDB
    if (method === "machine") saveToMachine(mapData, filename);
    if (method === "dropbox") saveToDropbox(mapData, filename);
  } catch (error) {
    ERROR && console.error(error);
    alertMessage.innerHTML = /* html */ `保存地图时出错。如果问题仍然存在，请复制以下消息并前往 ${link(
      "https://github.com/Azgaar/Fantasy-Map-Generator/issues",
      "GitHub"
    )} 报告 <p id="errorBox">${parseError(error)}</p>`;

    $("#alert").dialog({
      resizable: false,
      title: "Saving error",
      width: "28em",
      buttons: {
        Retry: function () {
          $(this).dialog("close");
          saveMap(method);
        },
        Close: function () {
          $(this).dialog("close");
        }
      },
      position: {my: "center", at: "center", of: "svg"}
    });
  }
}

function prepareMapData() {
  const date = new Date();
  const dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
  const license = "文件可以加载到azgaar.github.io/Fantasy-Map-Generator中";
  const params = [VERSION, license, dateString, seed, graphWidth, graphHeight, mapId].join("|");
  const settings = [
    distanceUnitInput.value,
    distanceScale,
    areaUnit.value,
    heightUnit.value,
    heightExponentInput.value,
    temperatureScale.value,
    "", // previously used for barSize.value
    "", // previously used for barLabel.value
    "", // previously used for barBackColor.value
    "", // previously used for barBackColor.value
    "", // previously used for barPosX.value
    "", // previously used for barPosY.value
    populationRate,
    urbanization,
    mapSizeOutput.value,
    latitudeOutput.value,
    "", // previously used for temperatureEquatorOutput.value
    "", // previously used for tempNorthOutput.value
    precOutput.value,
    JSON.stringify(options),
    mapName.value,
    +hideLabels.checked,
    stylePreset.value,
    +rescaleLabels.checked,
    urbanDensity,
    longitudeOutput.value,
    growthRate.value
  ].join("|");
  const coords = JSON.stringify(mapCoordinates);
  const biomes = [biomesData.color, biomesData.habitability, biomesData.name].join("|");
  const notesData = JSON.stringify(notes);
  const rulersString = rulers.toString();
  const fonts = JSON.stringify(getUsedFonts(svg.node()));

  // save svg
  const cloneEl = document.getElementById("map").cloneNode(true);

  // reset transform values to default
  cloneEl.setAttribute("width", graphWidth);
  cloneEl.setAttribute("height", graphHeight);
  cloneEl.querySelector("#viewbox").removeAttribute("transform");

  cloneEl.querySelector("#ruler").innerHTML = ""; // always remove rulers

  const serializedSVG = new XMLSerializer().serializeToString(cloneEl);

  const {spacing, cellsX, cellsY, boundary, points, features, cellsDesired} = grid;
  const gridGeneral = JSON.stringify({spacing, cellsX, cellsY, boundary, points, features, cellsDesired});
  const packFeatures = JSON.stringify(pack.features);
  const cultures = JSON.stringify(pack.cultures);
  const states = JSON.stringify(pack.states);
  const burgs = JSON.stringify(pack.burgs);
  const religions = JSON.stringify(pack.religions);
  const provinces = JSON.stringify(pack.provinces);
  const rivers = JSON.stringify(pack.rivers);
  const markers = JSON.stringify(pack.markers);
  const cellRoutes = JSON.stringify(pack.cells.routes);
  const routes = JSON.stringify(pack.routes);
  const zones = JSON.stringify(pack.zones);

  // store name array only if not the same as default
  const defaultNB = Names.getNameBases();
  const namesData = nameBases
    .map((b, i) => {
      const names = defaultNB[i] && defaultNB[i].b === b.b ? "" : b.b;
      return `${b.name}|${b.min}|${b.max}|${b.d}|${b.m}|${names}`;
    })
    .join("/");

  // round population to save space
  const pop = Array.from(pack.cells.pop).map(p => rn(p, 4));

  // data format as below
  const mapData = [
    params,
    settings,
    coords,
    biomes,
    notesData,
    serializedSVG,
    gridGeneral,
    grid.cells.h,
    grid.cells.prec,
    grid.cells.f,
    grid.cells.t,
    grid.cells.temp,
    packFeatures,
    cultures,
    states,
    burgs,
    pack.cells.biome,
    pack.cells.burg,
    pack.cells.conf,
    pack.cells.culture,
    pack.cells.fl,
    pop,
    pack.cells.r,
    [], // deprecated pack.cells.road
    pack.cells.s,
    pack.cells.state,
    pack.cells.religion,
    pack.cells.province,
    [], // deprecated pack.cells.crossroad
    religions,
    provinces,
    namesData,
    rivers,
    rulersString,
    fonts,
    markers,
    cellRoutes,
    routes,
    zones
  ].join("\r\n");
  return mapData;
}

// save map file to indexedDB
async function saveToStorage(mapData, showTip = false) {
  const blob = new Blob([mapData], {type: "text/plain"});
  await ldb.set("lastMap", blob);
  showTip && tip("地图已保存到浏览器缓存中", false, "success");
}

// download map file
function saveToMachine(mapData, filename) {
  const blob = new Blob([mapData], {type: "text/plain"});
  const URL = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.download = filename;
  link.href = URL;
  link.click();

  tip('地图保存到 “Download” 界面（按CTRL+J打开）', true, "success", 8000);
  window.URL.revokeObjectURL(URL);
}

async function saveToDropbox(mapData, filename) {
  await Cloud.providers.dropbox.save(filename, mapData);
  tip("地图已保存到您的Dropbox", true, "success", 8000);
}

async function initiateAutosave() {
  const MINUTE = 60000; // munite in milliseconds
  let lastSavedAt = Date.now();

  async function autosave() {
    const timeoutMinutes = byId("autosaveIntervalOutput").valueAsNumber;
    if (!timeoutMinutes) return;

    const diffInMinutes = (Date.now() - lastSavedAt) / MINUTE;
    if (diffInMinutes < timeoutMinutes) return;
    if (customization) return tip("自动保存：地图无法在编辑模式下保存", false, "warning", 2000);

    try {
      tip("自动保存：保存中……", false, "warning", 3000);
      const mapData = prepareMapData();
      await saveToStorage(mapData);
      tip("自动保存：保存成功", false, "success", 2000);

      lastSavedAt = Date.now();
    } catch (error) {
      ERROR && console.error(error);
    }
  }

  setInterval(autosave, MINUTE / 2);
}

// TODO: unused code
async function compressData(uncompressedData) {
  const compressedStream = new Blob([uncompressedData]).stream().pipeThrough(new CompressionStream("gzip"));

  let compressedData = [];
  for await (const chunk of compressedStream) {
    compressedData = compressedData.concat(Array.from(chunk));
  }

  return new Uint8Array(compressedData);
}

const saveReminder = function () {
  if (localStorage.getItem("noReminder")) return;
  const message = [
    "请记得时不时将项目保存到桌面",
    "请记得将地图保存到您的桌面",
    "保存将确保您的数据在出现问题时不会丢失",
    "安全是首要任务，请保存地图",
    "不要忘记定期保存您的地图！",
    "温馨提醒您保存地图",
    "请不要忘记保存您的进度（保存到桌面是最佳选择）",
    "不想再收到需要保存的提醒？按CTRL+Q"
  ];
  const interval = 15 * 60 * 1000; // remind every 15 minutes

  saveReminder.reminder = setInterval(() => {
    if (customization) return;
    tip(ra(message), true, "warn", 2500);
  }, interval);
  saveReminder.status = 1;
};
saveReminder();

function toggleSaveReminder() {
  if (saveReminder.status) {
    tip("保存提醒已关闭。再次按CTRL+Q重新启动", true, "warn", 2000);
    clearInterval(saveReminder.reminder);
    localStorage.setItem("noReminder", true);
    saveReminder.status = 0;
  } else {
    tip("保存提醒已打开。按CTRL+Q关闭", true, "warn", 2000);
    localStorage.removeItem("noReminder");
    saveReminder();
  }
}
