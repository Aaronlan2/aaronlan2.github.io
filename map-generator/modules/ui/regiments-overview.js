"use strict";
function overviewRegiments(state) {
  if (customization) return;
  closeDialogs(".stable");
  if (!layerIsOn("toggleMilitary")) toggleMilitary();

  const body = document.getElementById("regimentsBody");
  updateFilter(state);
  addLines();
  $("#regimentsOverview").dialog();

  if (modules.overviewRegiments) return;
  modules.overviewRegiments = true;
  updateHeaders();

  $("#regimentsOverview").dialog({
    title: "部队概览", // Regiments Overview
    resizable: false,
    width: fitContent(),
    position: {my: "right top", at: "right-10 top+10", of: "svg", collision: "fit"}
  });

  // 添加监听器
  document.getElementById("regimentsOverviewRefresh").addEventListener("click", addLines);
  document.getElementById("regimentsPercentage").addEventListener("click", togglePercentageMode);
  document.getElementById("regimentsAddNew").addEventListener("click", toggleAdd);
  document.getElementById("regimentsExport").addEventListener("click", downloadRegimentsData);
  document.getElementById("regimentsFilter").addEventListener("change", addLines);

  // 更新军事类型标题和工具提示
  function updateHeaders() {
    const header = document.getElementById("regimentsHeader");
    const units = options.military.length;
    header.style.gridTemplateColumns = `9em 13em repeat(${units}, 5.2em) 7em`;

    header.querySelectorAll(".removable").forEach(el => el.remove());
    const insert = html => document.getElementById("regimentsTotal").insertAdjacentHTML("beforebegin", html);
    for (const u of options.military) {
      const label = capitalize(u.name.replace(/_/g, " "));
      insert(
        `<div data-tip="${label} 部队单位数量。点击排序" class="sortable removable" data-sortby="${u.name}">${label}&nbsp;</div>` // Regiment ${u.name} units number. Click to sort
      );
    }
    header.querySelectorAll(".removable").forEach(function (e) {
      e.addEventListener("click", function () {
        sortLines(this);
      });
    });
  }

  // 为每个国家添加行
  function addLines() {
    const state = +regimentsFilter.value;
    body.innerHTML = "";
    let lines = "";
    const regiments = [];

    for (const s of pack.states) {
      if (!s.i || s.removed || !s.military.length) continue;
      if (state !== -1 && s.i !== state) continue; // 特定国家被选中

      for (const r of s.military) {
        const sortData = options.military.map(u => `data-${u.name}=${r.u[u.name] || 0}`).join(" ");
        const lineData = options.military
          .map(
            u => `<div data-type="${u.name}" data-tip="${capitalize(u.name)} 单位数量">${r.u[u.name] || 0}</div>` // Regiment's name
          )
          .join(" ");

        lines += /* html */ `<div class="states" data-id="${r.i}" data-s="${s.i}" data-state="${s.name}" data-name="${
          r.name
        }" ${sortData} data-total="${r.a}">
          <fill-box data-tip="${s.fullName}" fill="${s.color}" disabled></fill-box>
          <input data-tip="${s.fullName}" style="width:6em" value="${s.name}" readonly />
          ${
            r.icon.startsWith("http") || r.icon.startsWith("data:image")
              ? `<img src="${r.icon}" data-tip="部队标志" style="width:1.2em; height:1.2em; vertical-align: middle;">` // Regiment's emblem
              : `<span data-tip="部队标志" style="width:1em">${r.icon}</span>`
          }
          <input data-tip="部队名称" style="width:13em" value="${r.name}" readonly />
          ${lineData}
          <div data-type="total" data-tip="总兵力（不包括船员）" style="font-weight: bold">${
            r.a
          }</div> <!-- Total military personnel -->
          <span data-tip="编辑部队" onclick="editRegiment('#regiment${s.i}-${
          r.i
        }')" class="icon-pencil pointer"></span>
        </div>`;

        regiments.push(r);
      }
    }

    lines += /* html */ `<div id="regimentsTotalLine" class="totalLine" data-tip="所有显示部队的总数">
      <div style="width: 21em; margin-left: 1em">部队数量：${regiments.length}</div>
      ${options.military
        .map(u => `<div style="width:5em">${si(d3.sum(regiments.map(r => r.u[u.name] || 0)))}</div>`)
        .join(" ")}
      <div style="width:5em">${si(d3.sum(regiments.map(r => r.a)))}</div>
    </div>`;

    body.insertAdjacentHTML("beforeend", lines);
    if (body.dataset.type === "percentage") {
      body.dataset.type = "absolute";
      togglePercentageMode();
    }
    applySorting(regimentsHeader);

    // 添加监听器
    body.querySelectorAll("div.states").forEach(el => el.addEventListener("mouseenter", ev => regimentHighlightOn(ev)));
    body
      .querySelectorAll("div.states")
      .forEach(el => el.addEventListener("mouseleave", ev => regimentHighlightOff(ev)));
  }

  function updateFilter(state) {
    const filter = document.getElementById("regimentsFilter");
    filter.options.length = 0; // 移除所有选项
    filter.options.add(new Option(`全部`, -1, false, state === -1));
    const statesSorted = pack.states.filter(s => s.i && !s.removed).sort((a, b) => (a.name > b.name ? 1 : -1));
    statesSorted.forEach(s => filter.options.add(new Option(s.name, s.i, false, s.i == state)));
  }

  function regimentHighlightOn(event) {
    const state = +event.target.dataset.s;
    const id = +event.target.dataset.id;
    if (customization || !state) return;
    armies.select(`g > g#regiment${state}-${id}`).transition().duration(2000).style("fill", "#ff0000");
  }

  function regimentHighlightOff(event) {
    const state = +event.target.dataset.s;
    const id = +event.target.dataset.id;
    armies.select(`g > g#regiment${state}-${id}`).transition().duration(1000).style("fill", null);
  }

  function togglePercentageMode() {
    if (body.dataset.type === "absolute") {
      body.dataset.type = "percentage";
      const lines = body.querySelectorAll(":scope > div:not(.totalLine)");
      const array = Array.from(lines),
        cache = [];

      const total = function (type) {
        if (cache[type]) cache[type];
        cache[type] = d3.sum(array.map(el => +el.dataset[type]));
        return cache[type];
      };

      lines.forEach(function (el) {
        el.querySelectorAll("div").forEach(function (div) {
          const type = div.dataset.type;
          if (type === "rate") return;
          div.textContent = total(type) ? rn((+el.dataset[type] / total(type)) * 100) + "%" : "0%";
        });
      });
    } else {
      body.dataset.type = "absolute";
      addLines();
    }
  }

  function toggleAdd() {
    document.getElementById("regimentsAddNew").classList.toggle("pressed");
    if (document.getElementById("regimentsAddNew").classList.contains("pressed")) {
      viewbox.style("cursor", "crosshair").on("click", addRegimentOnClick);
      tip("点击地图创建新的部队或舰队", true); // Click on map to create new regiment or fleet
      if (regimentAdd.offsetParent) regimentAdd.classList.add("pressed");
    } else {
      clearMainTip();
      viewbox.on("click", clicked).style("cursor", "default");
      addLines();
      if (regimentAdd.offsetParent) regimentAdd.classList.remove("pressed");
    }
  }

  function addRegimentOnClick() {
    const state = +regimentsFilter.value;
    if (state === -1) return tip("请从列表中选择一个国家", false, "error"); // Please select state from the list

    const point = d3.mouse(this);
    const cell = findCell(point[0], point[1]);
    const x = pack.cells.p[cell][0],
      y = pack.cells.p[cell][1];
    const military = pack.states[state].military;
    const i = military.length ? last(military).i + 1 : 0;
    const n = +(pack.cells.h[cell] < 20); // naval or land
    const reg = {a: 0, cell, i, n, u: {}, x, y, bx: x, by: y, state, icon: "🛡️"};
    reg.name = Military.getName(reg, military);
    military.push(reg);
    Military.generateNote(reg, pack.states[state]); // add legend
    drawRegiment(reg, state);
    toggleAdd();
  }

  function downloadRegimentsData() {
    const units = options.military.map(u => u.name);
    let data =
      "国家,ID,图标,名称," +
      units.map(u => capitalize(u)).join(",") +
      ",X,Y,纬度,经度,基地X,基地Y,基地纬度,基地经度\n"; // headers

    for (const s of pack.states) {
      if (!s.i || s.removed || !s.military.length) continue;

      for (const r of s.military) {
        data += s.name + ",";
        data += r.i + ",";
        data += r.icon + ",";
        data += r.name + ",";
        data += units.map(unit => r.u[unit]).join(",") + ",";

        data += r.x + ",";
        data += r.y + ",";
        data += getLatitude(r.y, 2) + ",";
        data += getLongitude(r.x, 2) + ",";

        data += r.bx + ",";
        data += r.by + ",";
        data += getLatitude(r.by, 2) + ",";
        data += getLongitude(r.bx, 2) + "\n";
      }
    }

    const name = getFileName("军团") + ".csv";
    downloadFile(data, name);
  }
}