"use strict";
function editDiplomacy() {
  if (customization) return;
  if (pack.states.filter(s => s.i && !s.removed).length < 2)
    return tip("编辑外交至少需要两个国家", false, "error");

  const body = document.getElementById("diplomacyBodySection");

  closeDialogs("#diplomacyEditor, .stable");
  if (!layerIsOn("toggleStates")) toggleStates();
  if (!layerIsOn("toggleBorders")) toggleBorders();
  if (layerIsOn("toggleProvinces")) toggleProvinces();
  if (layerIsOn("toggleCultures")) toggleCultures();
  if (layerIsOn("toggleBiomes")) toggleBiomes();
  if (layerIsOn("toggleReligions")) toggleReligions();

  const relations = {
    "盟友": {
      inText: "为盟友",
      color: "#00b300",
      tip: "盟友之间形成防御同盟，在遭遇第三方侵略时互相保护"
    },
    "友好": {
      inText: "友好",
      color: "#d4f8aa",
      tip: "当国家之间有共同利益时，一国会对另一国表现出友好态度"
    },
    "中立": {
      inText: "保持中立",
      color: "#edeee8",
      tip: "中立意味着国家之间的关系既非积极也非消极"
    },
    "怀疑": {
      inText: "持怀疑态度",
      color: "#eeafaa",
      tip: "怀疑表示一国对另一国持有谨慎的不信任"
    },
    "敌对": {inText: "处于战争状态", color: "#e64b40", tip: "敌对国家是指彼此处于战争状态的国家"},
    "互不往来": {
      inText: "不往来",
      color: "#a9a9a9",
      tip: "如果国家之间没有足够的信息了解对方，它们的关系则为互不往来"
    },
    "竞争对手": {
      inText: "为竞争对手",
      color: "#ad5a1f",
      tip: "竞争关系是指国家为争夺地区主导权而产生的状态"
    },
    "附庸": {inText: "为附庸国", color: "#87CEFA", tip: "附庸国是对宗主国负有义务的国家"},
    "宗主": {
      inText: "为宗主国",
      color: "#00008B",
      tip: "宗主国对其附庸国拥有一定的控制权"
    }
  };

  refreshDiplomacyEditor();
  viewbox.style("cursor", "crosshair").on("click", selectStateOnMapClick);

  if (modules.editDiplomacy) return;
  modules.editDiplomacy = true;

  $("#diplomacyEditor").dialog({
    title: "外交编辑器",
    resizable: false,
    width: fitContent(),
    close: closeDiplomacyEditor,
    position: {my: "right top", at: "right-10 top+10", of: "svg", collision: "fit"}
  });

  // add listeners
  document.getElementById("diplomacyEditorRefresh").addEventListener("click", refreshDiplomacyEditor);
  document.getElementById("diplomacyEditStyle").addEventListener("click", () => editStyle("regions"));
  document.getElementById("diplomacyRegenerate").addEventListener("click", regenerateRelations);
  document.getElementById("diplomacyReset").addEventListener("click", resetRelations);
  document.getElementById("diplomacyShowMatrix").addEventListener("click", showRelationsMatrix);
  document.getElementById("diplomacyHistory").addEventListener("click", showRelationsHistory);
  document.getElementById("diplomacyExport").addEventListener("click", downloadDiplomacyData);

  body.addEventListener("click", function (ev) {
    const el = ev.target;
    if (el.parentElement.classList.contains("Self")) return;

    if (el.classList.contains("changeRelations")) {
      const line = el.parentElement;
      const subjectId = +line.dataset.id;
      const objectId = +body.querySelector("div.Self").dataset.id;
      const currentRelation = line.dataset.relations;

      selectRelation(subjectId, objectId, currentRelation);
      return;
    }

    // select state of clicked line
    body.querySelector("div.Self").classList.remove("Self");
    el.parentElement.classList.add("Self");
    refreshDiplomacyEditor();
  });

  function refreshDiplomacyEditor() {
    diplomacyEditorAddLines();
    showStateRelations();
  }

  // add line for each state
  function diplomacyEditorAddLines() {
    const states = pack.states;
    const selectedLine = body.querySelector("div.Self");
    const selectedId = selectedLine ? +selectedLine.dataset.id : states.find(s => s.i && !s.removed).i;
    const selectedName = states[selectedId].name;

    COArenderer.trigger("stateCOA" + selectedId, states[selectedId].coa);
    let lines = /* html */ `<div class="states Self" data-id=${selectedId} data-tip="以下列表显示了与 ${selectedName} 的关系">
      <div style="width: max-content">${states[selectedId].fullName}</div>
      <svg class="coaIcon" viewBox="0 0 200 200"><use href="#stateCOA${selectedId}"></use></svg>
    </div>`;

    for (const state of states) {
      if (!state.i || state.removed || state.i === selectedId) continue;
      const relation = state.diplomacy[selectedId];
      const {color, inText} = relations[relation];

      const tip = `${state.name} ${inText} ${selectedName}`;
      const tipSelect = `${tip}. 点击查看与 ${state.name} 的关系`;
      const tipChange = `点击改变关系 ${tip}`;

      const name = state.fullName.length < 23 ? state.fullName : state.name;
      COArenderer.trigger("stateCOA" + state.i, state.coa);

      lines += /* html */ `<div class="states" data-id=${state.i} data-name="${name}" data-relations="${relation}">
        <svg data-tip="${tipSelect}" class="coaIcon" viewBox="0 0 200 200"><use href="#stateCOA${state.i}"></use></svg>
        <div data-tip="${tipSelect}" style="width: 12em">${name}</div>
        <div data-tip="${tipChange}" class="changeRelations" style="width: 6em">
          <fill-box fill="${color}" size=".9em"></fill-box>
          ${relation}
        </div>
      </div>`;
    }
    body.innerHTML = lines;

    // add listeners
    body.querySelectorAll("div.states").forEach(el => el.addEventListener("mouseenter", ev => stateHighlightOn(ev)));
    body.querySelectorAll("div.states").forEach(el => el.addEventListener("mouseleave", ev => stateHighlightOff(ev)));

    applySorting(diplomacyHeader);
    $("#diplomacyEditor").dialog();
  }

  function stateHighlightOn(event) {
    if (!layerIsOn("toggleStates")) return;
    const state = +event.target.dataset.id;
    if (customization || !state) return;
    const d = regions.select("#state" + state).attr("d");

    const path = debug
      .append("path")
      .attr("class", "highlight")
      .attr("d", d)
      .attr("fill", "none")
      .attr("stroke", "red")
      .attr("stroke-width", 1)
      .attr("opacity", 1)
      .attr("filter", "url(#blur1)");

    const l = path.node().getTotalLength(),
      dur = (l + 5000) / 2;
    const i = d3.interpolateString("0," + l, l + "," + l);
    path
      .transition()
      .duration(dur)
      .attrTween("stroke-dasharray", function () {
        return t => i(t);
      });
  }

  function stateHighlightOff(event) {
    debug.selectAll(".highlight").each(function () {
      d3.select(this).transition().duration(1000).attr("opacity", 0).remove();
    });
  }

  function showStateRelations() {
    const selectedLine = body.querySelector("div.Self");
    const sel = selectedLine ? +selectedLine.dataset.id : pack.states.find(s => s.i && !s.removed).i;
    if (!sel) return;
    if (!layerIsOn("toggleStates")) toggleStates();

    statesBody.selectAll("path").each(function () {
      if (this.id.slice(0, 9) === "state-gap") return; // exclude state gap element
      const id = +this.id.slice(5); // state id

      const relation = pack.states[id].diplomacy[sel];
      const color = relations[relation]?.color || "#4682b4";

      this.setAttribute("fill", color);
      statesBody.select("#state-gap" + id).attr("stroke", color);
      statesHalo.select("#state-border" + id).attr("stroke", d3.color(color).darker().hex());
    });
  }

  function selectStateOnMapClick() {
    const point = d3.mouse(this);
    const i = findCell(point[0], point[1]);
    const state = pack.cells.state[i];
    if (!state) return;
    const selectedLine = body.querySelector("div.Self");
    if (+selectedLine.dataset.id === state) return;

    selectedLine.classList.remove("Self");
    body.querySelector("div[data-id='" + state + "']").classList.add("Self");
    refreshDiplomacyEditor();
  }

  function selectRelation(subjectId, objectId, currentRelation) {
    const states = pack.states;
    const subject = states[subjectId];

    const relationsSelector = Object.entries(relations)
      .map(
        ([relation, {color, inText, tip}]) => /* html */ `
          <div data-tip="${tip}">
            <label class="pointer">
              <input type="radio" name="relationSelect" value="${relation}"
              ${currentRelation === relation && "checked"} >
              <fill-box fill="${color}" size=".8em"></fill-box>
              ${inText}
          </label>
          </div>
        `
      )
      .join("");

    const objectsSelector = states
      .filter(s => s.i && !s.removed && s.i !== subjectId)
      .map(
        s => /* html */ `
          <div data-tip="${s.fullName}">
            <input id="selectState${s.i}" class="checkbox" type="checkbox" name="objectSelect" value="${s.i}"
            ${s.i === objectId && "checked"} />
            <label for="selectState${s.i}" class="checkbox-label">
              <svg class="coaIcon" viewBox="0 0 200 200">
                <use href="#stateCOA${s.i}"></use>
              </svg>
              ${s.fullName}
            </label>
          </div>
        `
      )
      .join("");

    alertMessage.innerHTML = /* html */ `
      <form id='relationsForm' style="overflow: hidden; display: flex; flex-direction: column; gap: .3em; padding: 0.1em 0;">
        <header>
          <svg class="coaIcon" viewBox="0 0 200 200">
            <use href="#stateCOA${subject.i}"></use>
          </svg>
          <b>${subject.fullName}</b>
        </header>

        <main style='display: flex; gap: 1em;'>
          <section style="display: flex; flex-direction: column; gap: .3em;">${relationsSelector}</section>
          <section style="display: flex; flex-direction: column; gap: .3em;">${objectsSelector}</section>
        </main>
      </form>
    `;

    $("#alert").dialog({
      width: fitContent(),
      title: `改变关系`,
      buttons: {
        "应用": function () {
          const formData = new FormData(byId("relationsForm"));
          const newRelation = formData.get("relationSelect");
          const objectIds = [...formData.getAll("objectSelect")].map(Number);

          for (const objectId of objectIds) {
            changeRelation(subjectId, objectId, currentRelation, newRelation);
          }
          $(this).dialog("close");
        },
        "取消": function () {
          $(this).dialog("close");
        }
      }
    });
  }

  function changeRelation(subjectId, objectId, oldRelation, newRelation) {
    if (newRelation === oldRelation) return;
    const states = pack.states;
    const chronicle = states[0].diplomacy;

    const subjectName = states[subjectId].name;
    const objectName = states[objectId].name;

    states[subjectId].diplomacy[objectId] = newRelation;
    states[objectId].diplomacy[subjectId] =
      newRelation === "附庸" ? "宗主" : newRelation === "宗主" ? "附庸" : newRelation;

    // update relation history
    const change = () => [
      `关系变化`,
      `${subjectName} 对于 ${getAdjective(objectName)} 的关系改变为 ${newRelation.toLowerCase()}`
    ];
    const ally = () => [`军事同盟协议`, `${subjectName} 与 ${objectName} 签订军事同盟协议`];
    const vassal = () => [`称臣`, `${subjectName} 向 ${objectName} 称臣`];
    const suzerain = () => [`称臣`, `${subjectName} 成为 ${objectName} 的宗主国`];
    const rival = () => [`竞争`, `${subjectName} 和 ${objectName} 成为了竞争对手`];
    const unknown = () => [
      `关系破裂`,
      `${subjectName} 召回了他们的大使，不再承认 ${objectName}，两国互不往来`
    ];
    const war = () => [`宣战`, `${subjectName} 向 ${objectName} 宣战`];
    const peace = () => {
      const treaty = `${subjectName} 和 ${objectName} 同意停火并签署和平条约`;
      const changed =
        newRelation === "盟友"
          ? ally()
          : newRelation === "附庸"
          ? vassal()
          : newRelation === "宗主"
          ? suzerain()
          : newRelation === "互不往来"
          ? unknown()
          : change();
      return [`战争结束`, treaty, changed[1]];
    };

    if (oldRelation === "敌对") chronicle.push(peace());
    else if (newRelation === "敌对") chronicle.push(war());
    else if (newRelation === "附庸") chronicle.push(vassal());
    else if (newRelation === "宗主") chronicle.push(suzerain());
    else if (newRelation === "盟友") chronicle.push(ally());
    else if (newRelation === "互不往来") chronicle.push(unknown());
    else if (newRelation === "竞争对手") chronicle.push(rival());
    else chronicle.push(change());

    refreshDiplomacyEditor();
    if (diplomacyMatrix.offsetParent) {
      document.getElementById("diplomacyMatrixBody").innerHTML = "";
      showRelationsMatrix();
    }
  }

  function regenerateRelations() {
    BurgsAndStates.generateDiplomacy();
    refreshDiplomacyEditor();
  }

  function resetRelations() {
    const selectedId = +body.querySelector("div.Self")?.dataset?.id;
    if (!selectedId) return;
    const states = pack.states;

    states[selectedId].diplomacy.forEach((relations, index) => {
      if (relations !== "x") {
        states[selectedId].diplomacy[index] = "中立";
        states[index].diplomacy[selectedId] = "中立";
      }
    });

    refreshDiplomacyEditor();
  }

  function showRelationsHistory() {
    const chronicle = pack.states[0].diplomacy;

    let message = /* html */ `<div autocorrect="off" spellcheck="false">`;
    chronicle.forEach((entry, index) => {
      message += `<div>`;
      entry.forEach((l, entryIndex) => {
        message += /* html */ `<div contenteditable="true" data-id="${index}-${entryIndex}"
          ${entryIndex ? "" : "style='font-weight:bold'"}>${l}</div>`;
      });
      message += `&#8205;</div>`;
    });

    if (!chronicle.length) {
      pack.states[0].diplomacy = [[]];
      message += /* html */ `<div><div contenteditable="true" data-id="0-0">无历史记录</div>&#8205;</div>`;
    }

    alertMessage.innerHTML =
      message +
      `</div><div class="info-line">输入要编辑的内容。按Enter键添加新行，清空元素将其删除</div>`;
    alertMessage
      .querySelectorAll("div[contenteditable='true']")
      .forEach(el => el.addEventListener("input", changeReliationsHistory));

    $("#alert").dialog({
      title: "交往历史",
      position: {my: "center", at: "center", of: "svg"},
      buttons: {
        "保存": function () {
          const data = this.querySelector("div").innerText.split("\n").join("\r\n");
          const name = getFileName("交往历史") + ".txt";
          downloadFile(data, name);
        },
        "清空": function () {
          pack.states[0].diplomacy = [];
          $(this).dialog("close");
        },
        "关闭": function () {
          $(this).dialog("close");
        }
      }
    });
  }

  function changeReliationsHistory() {
    const i = this.dataset.id.split("-");
    const group = pack.states[0].diplomacy[i[0]];
    if (this.innerHTML === "") {
      group.splice(i[1], 1);
      this.remove();
    } else group[i[1]] = this.innerHTML;
  }

  function showRelationsMatrix() {
    const states = pack.states.filter(s => s.i && !s.removed);
    const valid = states.map(state => state.i);
    const diplomacyMatrixBody = document.getElementById("diplomacyMatrixBody");

    let table = `<table><thead><tr><th data-tip='&#8205;'></th>`;
    table += states.map(state => `<th data-tip='对 ${state.fullName} 的关系'>${state.name}</th>`).join("") + `</tr>`;
    table += `<tbody>`;

    states.forEach(state => {
      table +=
        `<tr data-id=${state.i}><th data-tip='${state.fullName} 的关系'>${state.name}</th>` +
        state.diplomacy
          .filter((v, i) => valid.includes(i))
          .map((relation, index) => {
            const relationObj = relations[relation];
            if (!relationObj) return `<td class='${relation}'>${relation}</td>`;

            const objectState = pack.states[valid[index]];
            const tip = `${state.fullName} ${relationObj.inText} ${objectState.fullName}`;
            return `<td data-id=${objectState.i} data-tip='${tip}' class='${relation}'>${relation}</td>`;
          })
          .join("") +
        "</tr>";
    });

    table += `</tbody></table>`;
    diplomacyMatrixBody.innerHTML = table;

    const tableEl = diplomacyMatrixBody.querySelector("table");
    tableEl.addEventListener("click", function (event) {
      const el = event.target;
      if (el.tagName !== "TD") return;

      const currentRelation = el.innerText;
      if (!relations[currentRelation]) return;

      const subjectId = +el.closest("tr")?.dataset?.id;
      const objectId = +el?.dataset?.id;

      selectRelation(subjectId, objectId, currentRelation);
    });

    $("#diplomacyMatrix").dialog({
      title: "关系矩阵",
      position: {my: "center", at: "center", of: "svg"},
      buttons: {}
    });
  }

  function downloadDiplomacyData() {
    const states = pack.states.filter(s => s.i && !s.removed);
    const valid = states.map(s => s.i);

    let data = "," + states.map(s => s.name).join(",") + "\n"; // headers
    states.forEach(s => {
      const rels = s.diplomacy.filter((v, i) => valid.includes(i));
      data += s.name + "," + rels.join(",") + "\n";
    });

    const name = getFileName("关系") + ".csv";
    downloadFile(data, name);
  }

  function closeDiplomacyEditor() {
    restoreDefaultEvents();
    clearMainTip();
    const selected = body.querySelector("div.Self");
    if (selected) selected.classList.remove("Self");
    if (layerIsOn("toggleStates")) drawStates();
    else toggleStates();
    debug.selectAll(".highlight").remove();
  }
}
