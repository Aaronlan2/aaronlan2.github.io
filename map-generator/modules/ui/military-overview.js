"use strict";
function overviewMilitary() {
  if (customization) return;
  closeDialogs("#militaryOverview, .stable");
  if (!layerIsOn("toggleStates")) toggleStates();
  if (!layerIsOn("toggleBorders")) toggleBorders();
  if (!layerIsOn("toggleMilitary")) toggleMilitary();

  const body = document.getElementById("militaryBody");
  addLines();
  $("#militaryOverview").dialog();

  if (modules.overviewMilitary) return;
  modules.overviewMilitary = true;
  updateHeaders();

  $("#militaryOverview").dialog({
    title: "军事概览",
    resizable: false,
    width: fitContent(),
    position: {
      my: "right top",
      at: "right - 10 top+10",
      of: "svg",
      collision: "fit",
    },
  });

  // 添加监听器
  document
    .getElementById("militaryOverviewRefresh")
    .addEventListener("click", addLines);
  document
    .getElementById("militaryPercentage")
    .addEventListener("click", togglePercentageMode);
  document
    .getElementById("militaryOptionsButton")
    .addEventListener("click", militaryCustomize);
  document
    .getElementById("militaryRegimentsList")
    .addEventListener("click", () => overviewRegiments(-1));
  document
    .getElementById("militaryOverviewRecalculate")
    .addEventListener("click", militaryRecalculate);
  document
    .getElementById("militaryExport")
    .addEventListener("click", downloadMilitaryData);
  document
    .getElementById("militaryWiki")
    .addEventListener("click", () => wiki("Military - Forces"));

  body.addEventListener("change", function (ev) {
    const el = ev.target,
      line = el.parentNode,
      state = +line.dataset.id;
    changeAlert(state, line, +el.value);
  });

  body.addEventListener("click", function (ev) {
    const el = ev.target,
      line = el.parentNode,
      state = +line.dataset.id;
    if (el.tagName === "SPAN") overviewRegiments(state);
  });

  // 更新表头和工具提示中的军事类型
  function updateHeaders() {
    const header = document.getElementById("militaryHeader");
    const units = options.military.length;
    header.style.gridTemplateColumns = `8em repeat(${units}, 5.2em) 4em 7em 5em 6em`;

    header.querySelectorAll(".removable").forEach((el) => el.remove());
    const insert = (html) =>
      document
        .getElementById("militaryTotal")
        .insertAdjacentHTML("beforebegin", html);
    for (const u of options.military) {
      const label = capitalize(u.name.replace(/_/g, " "));
      insert(
        `<div data - tip="国家 ${
          u.name
        } 单位数量。点击进行排序" class="sortable removable" data - sortby="${u.name.toLowerCase()}">${label}&nbsp;</div>`
      );
    }
    header.querySelectorAll(".removable").forEach(function (e) {
      e.addEventListener("click", function () {
        sortLines(this);
      });
    });
  }

  // 为每个国家添加一行
  function addLines() {
    body.innerHTML = "";
    let lines = "";
    const states = pack.states.filter((s) => s.i && !s.removed);

    for (const s of states) {
      const population = rn(
        (s.rural + s.urban * urbanization) * populationRate
      );
      const getForces = (u) =>
        s.military.reduce((s, r) => s + (r.u[u.name] || 0), 0);
      const total = options.military.reduce(
        (s, u) => s + getForces(u) * u.crew,
        0
      );
      const rate = (total / population) * 100;

      const sortData = options.military
        .map((u) => `data - ${u.name.toLowerCase()}="${getForces(u)}"`)
        .join(" ");
      const lineData = options.military
        .map(
          (u) =>
            `<div data - type="${u.name}" data - tip="国家 ${
              u.name
            } 单位数量">${getForces(u)}</div>`
        )
        .join(" ");

      lines += /* html */ `<div
            class="states"
            data - id=${s.i}
            data - state="${s.name}"
            ${sortData}
            data - total="${total}"
            data - population="${population}"
            data - rate="${rate}"
            data - alert="${s.alert}"
          >
            <fill - box data - tip="${s.fullName}" fill="${
        s.color
      }" disabled></fill - box>
            <input data - tip="${s.fullName}" style="width:6em" value="${
        s.name
      }" readonly />
            ${lineData}
            <div data - type="total" data - tip="国家军事人员总数（考虑编制）" style="font - weight: bold">${si(
              total
            )}</div>
            <div data - type="population" data - tip="国家人口">${si(
              population
            )}</div>
            <div data - type="rate" data - tip="军事人员比例（占国家人口的百分比）。取决于战争警报级别">${rn(
              rate,
              2
            )}%</div>
            <input
              data - tip="战争警报。可编辑的军事力量数量修正值，取决于政治局势"
              style="width:4.1em"
              type="number"
              min="0"
              step=".01"
              value="${rn(s.alert, 2)}"
            />
            <span data - tip="显示军团列表" class="icon - list - bullet pointer"></span>
          </div>`;
    }
    body.insertAdjacentHTML("beforeend", lines);
    updateFooter();

    // 添加监听器
    body
      .querySelectorAll("div.states")
      .forEach((el) =>
        el.addEventListener("mouseenter", (ev) => stateHighlightOn(ev))
      );
    body
      .querySelectorAll("div.states")
      .forEach((el) =>
        el.addEventListener("mouseleave", (ev) => stateHighlightOff(ev))
      );

    if (body.dataset.type === "percentage") {
      body.dataset.type = "absolute";
      togglePercentageMode();
    }
    applySorting(militaryHeader);
  }

  function changeAlert(state, line, alert) {
    const s = pack.states[state];
    const dif = s.alert || alert ? alert / s.alert : 0; // 修正值
    s.alert = line.dataset.alert = alert;

    s.military.forEach((r) => {
      Object.keys(r.u).forEach((u) => (r.u[u] = rn(r.u[u] * dif))); // 更改单位数值
      r.a = d3.sum(Object.values(r.u)); // 更改总数
      armies
        .select(`g>g#regiment${s.i}-${r.i}>text`)
        .text(Military.getTotal(r)); // 更改图标文本
    });

    const getForces = (u) =>
      s.military.reduce((s, r) => s + (r.u[u.name] || 0), 0);
    options.military.forEach(
      (u) =>
        (line.dataset[u.name] = line.querySelector(
          `div[data - type='${u.name}']`
        ).innerHTML =
          getForces(u))
    );

    const population = rn((s.rural + s.urban * urbanization) * populationRate);
    const total = (line.dataset.total = options.military.reduce(
      (s, u) => s + getForces(u) * u.crew,
      0
    ));
    const rate = (line.dataset.rate = (total / population) * 100);
    line.querySelector("div[data - type='total']").innerHTML = si(total);
    line.querySelector("div[data - type='rate']").innerHTML = rn(rate, 2) + "%";

    updateFooter();
  }

  function updateFooter() {
    const lines = Array.from(body.querySelectorAll(":scope > div"));
    const statesNumber = (militaryFooterStates.innerHTML = pack.states.filter(
      (s) => s.i && !s.removed
    ).length);
    const total = d3.sum(lines.map((el) => el.dataset.total));
    militaryFooterForcesTotal.innerHTML = si(total);
    militaryFooterForces.innerHTML = si(total / statesNumber);
    militaryFooterRate.innerHTML =
      rn(d3.sum(lines.map((el) => el.dataset.rate)) / statesNumber, 2) + "%";
    militaryFooterAlert.innerHTML = rn(
      d3.sum(lines.map((el) => el.dataset.alert)) / statesNumber,
      2
    );
  }

  function stateHighlightOn(event) {
    const state = +event.target.dataset.id;
    if (customization || !state) return;
    armies
      .select("#army" + state)
      .transition()
      .duration(2000)
      .style("fill", "#ff0000");

    if (!layerIsOn("toggleStates")) return;
    const d = regions.select("#state" + state).attr("d");

    const path = debug
      .append("path")
      .attr("class", "highlight")
      .attr("d", d)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke - width", 1)
      .attr("opacity", 1)
      .attr("filter", "url(#blur1)");

    const l = path.node().getTotalLength(),
      dur = (l + 5000) / 2;
    const i = d3.interpolateString("0," + l, l + "," + l);
    path
      .transition()
      .duration(dur)
      .attrTween("stroke - dasharray", function () {
        return (t) => i(t);
      });
  }

  function stateHighlightOff(event) {
    debug.selectAll(".highlight").each(function () {
      d3.select(this).transition().duration(1000).attr("opacity", 0).remove();
    });

    const state = +event.target.dataset.id;
    armies
      .select("#army" + state)
      .transition()
      .duration(1000)
      .style("fill", null);
  }

  function togglePercentageMode() {
    if (body.dataset.type === "absolute") {
      body.dataset.type = "percentage";
      const lines = body.querySelectorAll(":scope > div");
      const array = Array.from(lines),
        cache = [];

      const total = function (type) {
        if (cache[type]) cache[type];
        cache[type] = d3.sum(array.map((el) => +el.dataset[type]));
        return cache[type];
      };

      lines.forEach(function (el) {
        el.querySelectorAll("div").forEach(function (div) {
          const type = div.dataset.type;
          if (type === "rate") return;
          div.textContent = total(type)
            ? rn((+el.dataset[type] / total(type)) * 100) + "%"
            : "0%";
        });
      });
    } else {
      body.dataset.type = "absolute";
      addLines();
    }
  }

  function militaryCustomize() {
    const types = [
      "melee",
      "ranged",
      "mounted",
      "machinery",
      "naval",
      "armored",
      "aviation",
      "magical",
    ];
    const tableBody = document
      .getElementById("militaryOptions")
      .querySelector("tbody");
    removeUnitLines();
    options.military.map((unit) => addUnitLine(unit));

    $("#militaryOptions").dialog({
      title: "编辑军事单位",
      resizable: false,
      width: fitContent(),
      position: { my: "center", at: "center", of: "svg" },
      buttons: {
        应用: applyMilitaryOptions,
        添加: () =>
          addUnitLine({
            icon: "🛡️",
            name: "custom" + militaryOptionsTable.rows.length,
            rural: 0.2,
            urban: 0.5,
            crew: 1,
            power: 1,
            type: "melee",
          }),
        恢复: restoreDefaultUnits,
        取消: function () {
          $(this).dialog("close");
        },
      },
      open: function () {
        const buttons = $(this)
          .dialog("widget")
          .find(".ui - dialog - buttonset > button");
        buttons[0].addEventListener("mousemove", () =>
          tip(
            "应用军事单位设置。<span style='color:#cb5858'>所有部队将重新计算！</span>"
          )
        );
        buttons[1].addEventListener("mousemove", () =>
          tip("向表格中添加新的军事单位")
        );
        buttons[2].addEventListener("mousemove", () =>
          tip("恢复默认的军事单位和设置")
        );
        buttons[3].addEventListener("mousemove", () =>
          tip("关闭窗口而不保存更改")
        );
      },
    });

    if (modules.overviewMilitaryCustomize) return;
    modules.overviewMilitaryCustomize = true;

    tableBody.addEventListener("click", (event) => {
      const el = event.target;
      if (el.tagName !== "BUTTON") return;
      const type = el.dataset.type;

      if (type === "icon") {
        return selectIcon(el.textContent, function (value) {
          el.innerHTML =
            value.startsWith("http") || value.startsWith("data:image")
              ? `<img src="${value}" style="width:1.2em;height:1.2em;pointer - events:none;">`
              : value;
        });
      }

      if (type === "biomes") {
        const { i, name, color } = biomesData;
        const biomesArray = Array(i.length).fill(null);
        const biomes = biomesArray.map((_, i) => ({
          i,
          name: name[i],
          color: color[i],
        }));
        return selectLimitation(el, biomes);
      }
      if (type === "states") return selectLimitation(el, pack.states);
      if (type === "cultures") return selectLimitation(el, pack.cultures);
      if (type === "religions") return selectLimitation(el, pack.religions);
    });

    function removeUnitLines() {
      tableBody.querySelectorAll("tr").forEach((el) => el.remove());
    }

    function getLimitValue(attr) {
      return attr?.join(",") || "";
    }

    function getLimitText(attr) {
      return attr?.length ? "部分" : "全部";
    }

    function getLimitTip(attr, data) {
      if (!attr || !attr.length) return "";
      return attr.map((i) => data?.[i]?.name || "").join(", ");
    }

    function addUnitLine(unit) {
      const { type, icon, name, rural, urban, power, crew, separate } = unit;
      const row = document.createElement("tr");
      const typeOptions = types
        .map(
          (t) =>
            `<option ${type === t ? "selected" : ""} value="${t}">${t}</option>`
        )
        .join(" ");

      const getLimitButton = (attr) =>
        `<button 
                data - tip="选择允许的 ${attr}"
                data - type="${attr}"
                title="${getLimitTip(unit[attr], pack[attr])}"
                data - value="${getLimitValue(unit[attr])}">
                ${getLimitText(unit[attr])}
              </button>`;

      row.innerHTML = /* html */ `<td>
            <button data - type="icon" data - tip="点击选择单位图标">
              ${
                icon.startsWith("http") || icon.startsWith("data:image")
                  ? `<img src="${icon}" style="width:1.2em;height:1.2em;pointer - events:none;">`
                  : icon || ""
              }
            </button>
          </td>
          <td><input data - tip="输入单位名称。如果现有单位的名称更改，旧单位将被替换" value="${name}" /></td>
          <td>${getLimitButton("biomes")}</td>
          <td>${getLimitButton("states")}</td>
          <td>${getLimitButton("cultures")}</td>
          <td>${getLimitButton("religions")}</td>
          <td><input data - tip="输入农村人口的征兵百分比" type="number" min="0" max="100" step=".01" value="${rural}" /></td>
          <td><input data - tip="输入城市人口的征兵百分比" type="number" min="0" max="100" step=".01" value="${urban}" /></td>
          <td><input data - tip="输入平均编制人数（用于计算总兵力）" type="number" min="1" step="1" value="${crew}" /></td>
          <td><input data - tip="输入军事力量（用于战斗模拟）" type="number" min="0" step=".1" value="${power}" /></td>
          <td>
            <select data - tip="选择单位类型以应用特殊的部队重新计算规则">
              ${typeOptions}
            </select>
          </td>
          <td data - tip="勾选表示该单位是 <b>独立的</b> 并且只能与相同单位堆叠">
            <input id="${name}Separate" type="checkbox" class="checkbox" ${
        separate ? "checked" : ""
      } />
            <label for="${name}Separate" class="checkbox - label"></label>
          </td>
          <td data - tip="移除该单位">
            <span data - tip="移除单位类型" class="icon - trash - empty pointer" onclick="this.parentElement.parentElement.remove();"></span>
          </td>`;
      tableBody.appendChild(row);
    }

    function restoreDefaultUnits() {
      removeUnitLines();
      Military.getDefaultOptions().map((unit) => addUnitLine(unit));
    }

    function selectLimitation(el, data) {
      const type = el.dataset.type;
      const value = el.dataset.value;
      const initial = value ? value.split(",").map((v) => +v) : [];

      const filtered = data.filter((datum) => datum.i && !datum.removed);
      const lines = filtered.map(
        ({ i, name, fullName, color }) =>
          `<tr data - tip="${name}"><td><span style="color:${color}">⬤</span></td>
            <td><input data - i="${i}" id="el${i}" type="checkbox" class="checkbox" ${
            !initial.length || initial.includes(i) ? "checked" : ""
          } >
            <label for="el${i}" class="checkbox - label">${
            fullName || name
          }</label>
            </td></tr>`
      );
      alertMessage.innerHTML = /* html */ `<b>按 ${type} 限制单位:</b>
        <table style="margin - top:.3em">
            <tbody>
                ${lines.join("")}
            </tbody>
        </table>`;

      $("#alert").dialog({
        width: fitContent(),
        title: `限制单位`,
        buttons: {
          限制: function () {
            alertMessage
              .querySelectorAll("input")
              .forEach((el) => (el.checked = !el.checked));
          },
          应用: function () {
            const inputs = Array.from(alertMessage.querySelectorAll("input"));
            const selected = inputs.reduce((acc, input) => {
              if (input.checked) acc.push(input.dataset.i);
              return acc;
            }, []);

            if (!selected.length)
              return tip("至少选择一个元素", false, "error");

            const allAreSelected = selected.length === inputs.length;
            el.dataset.value = allAreSelected ? "" : selected.join(",");
            el.innerHTML = allAreSelected ? "全部" : "部分";
            el.setAttribute("title", getLimitTip(selected, data));
            $(this).dialog("close");
          },
          取消: function () {
            $(this).dialog("close");
          },
        },
      });
    }

    function applyMilitaryOptions() {
      const unitLines = Array.from(tableBody.querySelectorAll("tr"));
      const names = unitLines.map((r) =>
        r
          .querySelector("input")
          .value.replace(/[&\/\\#, +()$~%.'":*?<>{}]/g, "_")
      );
      if (new Set(names).size !== names.length)
        return tip("所有单位必须有唯一的名称", false, "error");

      $("#militaryOptions").dialog("close");

      options.military = unitLines.map((r, i) => {
        const elements = Array.from(
          r.querySelectorAll("input, button, select")
        );
        const [
          icon,
          name,
          biomes,
          states,
          cultures,
          religions,
          rural,
          urban,
          crew,
          power,
          type,
          separate,
        ] = elements.map((el) => {
          const { type, value } = el.dataset || {};
          if (type === "icon") {
            const value = el.innerHTML.trim();
            const isImage = value.startsWith("<img");
            return isImage ? value.match(/src="([^"]*)"/)[1] : value || "⠀";
          }
          if (type)
            return value ? value.split(",").map((v) => parseInt(v)) : null;
          if (el.type === "number") return +el.value || 0;
          if (el.type === "checkbox") return +el.checked || 0;
          return el.value;
        });

        const unit = {
          icon,
          name: names[i],
          rural,
          urban,
          crew,
          power,
          type,
          separate,
        };
        if (biomes) unit.biomes = biomes;
        if (states) unit.states = states;
        if (cultures) unit.cultures = cultures;
        if (religions) unit.religions = religions;
        return unit;
      });
      localStorage.setItem("military", JSON.stringify(options.military));
      Military.generate();
      updateHeaders();
      addLines();
    }
  }

  function militaryRecalculate() {
    alertMessage.innerHTML =
      "你确定要重新计算所有国家的军事力量吗？<br>所有国家的军团将被重新生成";
    $("#alert").dialog({
      resizable: false,
      title: "移除军团",
      buttons: {
        确定: function () {
          $(this).dialog("close");
          Military.generate();
          addLines();
        },
        取消: function () {
          $(this).dialog("close");
        },
      },
    });
  }

  function downloadMilitaryData() {
    const units = options.military.map((u) => u.name);
    let data =
      "编号,国家," +
      units.map((u) => capitalize(u)).join(",") +
      ",总数,人口,比例,战争警报\n"; // 表头

    body.querySelectorAll(":scope > div").forEach(function (el) {
      data += el.dataset.id + ",";
      data += el.dataset.state + ",";
      data += units.map((u) => el.dataset[u.toLowerCase()]).join(",") + ",";
      data += el.dataset.total + ",";
      data += el.dataset.population + ",";
      data += rn(el.dataset.rate, 2) + "%,";
      data += el.dataset.alert + "\n";
    });

    const name = getFileName("军事") + ".csv";
    downloadFile(data, name);
  }
}
