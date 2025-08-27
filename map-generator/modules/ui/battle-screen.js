"use strict";
class Battle {
  constructor(attacker, defender) {
    if (customization) return;
    closeDialogs(".stable");
    customization = 13; // 进入自定义模式以避免不必要的对话框关闭

    Battle.prototype.context = this; // 存储上下文
    this.iteration = 0;
    this.x = defender.x;
    this.y = defender.y;
    this.cell = findCell(this.x, this.y);
    this.attackers = {regiments: [], distances: [], morale: 100, casualties: 0, power: 0};
    this.defenders = {regiments: [], distances: [], morale: 100, casualties: 0, power: 0};

    this.addHeaders();
    this.addRegiment("attackers", attacker);
    this.addRegiment("defenders", defender);
    this.place = this.definePlace();
    this.defineType();
    this.name = this.defineName();
    this.randomize();
    this.calculateStrength("attackers");
    this.calculateStrength("defenders");
    this.getInitialMorale();

    $("#battleScreen").dialog({
      title: this.name,
      resizable: false,
      width: fitContent(),
      position: {my: "center", at: "center", of: "#map"},
      close: () => Battle.prototype.context.cancelResults()
    });

    if (modules.Battle) return;
    modules.Battle = true;

    // 添加监听器
    byId("battleType").on("click", ev => this.toggleChange(ev));
    byId("battleType").nextElementSibling.on("click", ev => Battle.prototype.context.changeType(ev));
    byId("battleNameShow").on("click", () => Battle.prototype.context.showNameSection());
    byId("battleNamePlace").on("change", ev => (Battle.prototype.context.place = ev.target.value));
    byId("battleNameFull").on("change", ev => Battle.prototype.context.changeName(ev));
    byId("battleNameCulture").on("click", () => Battle.prototype.context.generateName("culture"));
    byId("battleNameRandom").on("click", () => Battle.prototype.context.generateName("random"));
    byId("battleNameHide").on("click", this.hideNameSection);
    byId("battleAddRegiment").on("click", this.addSide);
    byId("battleRoll").on("click", () => Battle.prototype.context.randomize());
    byId("battleRun").on("click", () => Battle.prototype.context.run());
    byId("battleApply").on("click", () => Battle.prototype.context.applyResults());
    byId("battleCancel").on("click", () => Battle.prototype.context.cancelResults());
    byId("battleWiki").on("click", () => wiki("Battle-Simulator"));

    byId("battlePhase_attackers").on("click", ev => this.toggleChange(ev));
    byId("battlePhase_attackers").nextElementSibling.on("click", ev =>
      Battle.prototype.context.changePhase(ev, "attackers")
    );
    byId("battlePhase_defenders").on("click", ev => this.toggleChange(ev));
    byId("battlePhase_defenders").nextElementSibling.on("click", ev =>
      Battle.prototype.context.changePhase(ev, "defenders")
    );
    byId("battleDie_attackers").on("click", () => Battle.prototype.context.rollDie("attackers"));
    byId("battleDie_defenders").on("click", () => Battle.prototype.context.rollDie("defenders"));
  }

  defineType() {
    const attacker = this.attackers.regiments[0];
    const defender = this.defenders.regiments[0];
    const getType = () => {
      const typesA = Object.keys(attacker.u).map(name => options.military.find(u => u.name === name).type);
      const typesD = Object.keys(defender.u).map(name => options.military.find(u => u.name === name).type);

      if (attacker.n && defender.n) return "naval"; // 攻击者和防御者都是海军
      if (typesA.every(t => t === "aviation") && typesD.every(t => t === "aviation")) return "air"; // 若攻击者和防御者只有空中单位
      if (attacker.n && !defender.n && typesA.some(t => t !== "naval")) return "landing"; // 若攻击者是海军且有非海军单位，防御者非海军
      if (!defender.n && pack.burgs[pack.cells.burg[this.cell]].walls) return "siege"; // 防御者在有城墙的城镇中
      if (P(0.1) && [5, 6, 7, 8, 9, 12].includes(pack.cells.biome[this.cell])) return "ambush"; // 防御者在森林或沼泽时，20%概率为伏击
      return "field";
    };

    this.type = getType();
    this.setType();
  }

  setType() {
    byId("battleType").className = "icon-button-" + this.type;

    const sideSpecific = byId("battlePhases_" + this.type + "_attackers");
    const attackers = sideSpecific ? sideSpecific.content : byId("battlePhases_" + this.type).content;
    const defenders = sideSpecific ? byId("battlePhases_" + this.type + "_defenders").content : attackers;

    byId("battlePhase_attackers").nextElementSibling.innerHTML = "";
    byId("battlePhase_defenders").nextElementSibling.innerHTML = "";
    byId("battlePhase_attackers").nextElementSibling.append(attackers.cloneNode(true));
    byId("battlePhase_defenders").nextElementSibling.append(defenders.cloneNode(true));
  }

  definePlace() {
    const cells = pack.cells,
      i = this.cell;
    const burg = cells.burg[i] ? pack.burgs[cells.burg[i]].name : null;
    const getRiver = i => {
      const river = pack.rivers.find(r => r.i === i);
      return river.name + " " + river.type;
    };
    const river = !burg && cells.r[i] ? getRiver(cells.r[i]) : null;
    const proper = burg || river ? null : Names.getCulture(cells.culture[this.cell]);
    return burg ? burg : river ? river : proper;
  }

  defineName() {
    if (this.type === "field") return this.place + "之战";
    if (this.type === "naval") return this.place + "海战";
    if (this.type === "siege") return this.place + "围城战";
    if (this.type === "ambush") return this.place + "伏击战";
    if (this.type === "landing") return this.place + "登陆战";
    if (this.type === "air") return `${this.place} ${P(0.8) ? "空战" : "空中格斗"}`;
  }

  getTypeName() {
    if (this.type === "field") return "野战";
    if (this.type === "naval") return "海战";
    if (this.type === "siege") return "围城战";
    if (this.type === "ambush") return "伏击战";
    if (this.type === "landing") return "登陆战";
    if (this.type === "air") return "空战";
  }

  addHeaders() {
    let headers = "<thead><tr><th></th><th></th>";

    for (const u of options.military) {
      const label = capitalize(u.name.replace(/_/g, " "));
      const isExternal = u.icon.startsWith("http") || u.icon.startsWith("data:image");
      const iconHTML = isExternal ? `<img src="${u.icon}" width="15" height="15">` : u.icon;
      headers += `<th data-tip="${label}">${iconHTML}</th>`;
    }

    headers += "<th data-tip='总兵力''>总兵力</th></tr></thead>";
    battleAttackers.innerHTML = battleDefenders.innerHTML = headers;
  }

  addRegiment(side, regiment) {
    regiment.casualties = Object.keys(regiment.u).reduce((a, b) => ((a[b] = 0), a), {});
    regiment.survivors = Object.assign({}, regiment.u);

    const state = pack.states[regiment.state];
    const distance = (Math.hypot(this.y - regiment.by, this.x - regiment.bx) * distanceScale) | 0; // 军团与其基地的距离
    const color = state.color[0] === "#" ? state.color : "#999";

    const isExternal = regiment.icon.startsWith("http") || regiment.icon.startsWith("data:image");
    const iconHtml = isExternal
      ? `<image href="${regiment.icon}" x="0.1em" y="0.1em" width="1.2em" height="1.2em"></image>`
      : `<text x="50%" y="1em" style="text-anchor: middle">${regiment.icon}</text>`;
    const icon = `<svg width="1.4em" height="1.4em" style="margin-bottom: -.6em; stroke: #333">
      <rect x="0" y="0" width="100%" height="100%" fill="${color}"></rect>${iconHtml}</svg>`;
    const body = `<tbody id="battle${state.i}-${regiment.i}">`;

    let initial = `<tr class="battleInitial"><td>${icon}</td><td class="regiment" data-tip="${
      regiment.name
    }">${regiment.name.slice(0, 24)}</td>`;
    let casualties = `<tr class="battleCasualties"><td></td><td data-tip="${state.fullName}">${state.fullName.slice(
      0,
      26
    )}</td>`;
    let survivors = `<tr class="battleSurvivors"><td></td><td data-tip="补给线长度，影响士气">距基地距离：${distance} ${distanceUnitInput.value}</td>`;

    for (const u of options.military) {
      initial += `<td data-tip="初始兵力" style="width: 2.5em; text-align: center">${
        regiment.u[u.name] || 0
      }</td>`;
      casualties += `<td data-tip="伤亡数" style="width: 2.5em; text-align: center; color: red">0</td>`;
      survivors += `<td data-tip="幸存者" style="width: 2.5em; text-align: center; color: green">${
        regiment.u[u.name] || 0
      }</td>`;
    }

    initial += `<td data-tip="初始兵力" style="width: 2.5em; text-align: center">${regiment.a || 0}</td></tr>`;
    casualties += `<td data-tip="伤亡总数"  style="width: 2.5em; text-align: center; color: red">0</td></tr>`;
    survivors += `<td data-tip="幸存总数" style="width: 2.5em; text-align: center; color: green">${
      regiment.a || 0
    }</td></tr>`;

    const div = side === "attackers" ? battleAttackers : battleDefenders;
    div.innerHTML += body + initial + casualties + survivors + "</tbody>";
    this[side].regiments.push(regiment);
    this[side].distances.push(distance);
  }

  addSide() {
    const body = byId("regimentSelectorBody");
    const context = Battle.prototype.context;
    const regiments = pack.states
      .filter(s => s.military && !s.removed)
      .map(s => s.military)
      .flat();
    const distance = reg =>
      rn(Math.hypot(context.y - reg.y, context.x - reg.x) * distanceScale) + " " + distanceUnitInput.value;
    const isAdded = reg =>
      context.defenders.regiments.some(r => r === reg) || context.attackers.regiments.some(r => r === reg);

    body.innerHTML = regiments
      .map(r => {
        const s = pack.states[r.state],
          added = isAdded(r),
          dist = added ? "0 " + distanceUnitInput.value : distance(r);
        return `<div ${added ? "class='inactive'" : ""} data-s=${s.i} data-i=${r.i} data-state=${
          s.name
        } data-regiment=${r.name} 
        data-total=${r.a} data-distance=${dist} data-tip="点击选择军团">
        <svg width=".9em" height=".9em" style="margin-bottom:-1px; stroke: #333"><rect x="0" y="0" width="100%" height="100%" fill="${
          s.color
        }" ></svg>
        <div style="width:6em">${s.name.slice(0, 11)}</div>
        <div style="width:1.2em">${r.icon}</div>
        <div style="width:13em">${r.name.slice(0, 24)}</div>
        <div style="width:4em">${r.a}</div>
        <div style="width:4em">${dist}</div>
      </div>`;
      })
      .join("");

    $("#regimentSelectorScreen").dialog({
      resizable: false,
      width: fitContent(),
      title: "向战斗中添加军团",
      position: {my: "left center", at: "right+10 center", of: "#battleScreen"},
      close: addSideClosed,
      buttons: {
        "添加到攻击者": () => addSideClicked("attackers"),
        "添加到防御者": () => addSideClicked("defenders"),
        取消: () => $("#regimentSelectorScreen").dialog("close")
      }
    });

    applySorting(regimentSelectorHeader);
    body.on("click", selectLine);

    function selectLine(ev) {
      if (ev.target.className === "inactive") {
        tip("该军团已在战斗中", false, "error");
        return;
      }
      ev.target.classList.toggle("selected");
    }

    function addSideClicked(side) {
      const selected = body.querySelectorAll(".selected");
      if (!selected.length) {
        tip("请先选择一个军团", false, "error");
        return;
      }

      $("#regimentSelectorScreen").dialog("close");
      selected.forEach(line => {
        const state = pack.states[line.dataset.s];
        const regiment = state.military.find(r => r.i == +line.dataset.i);
        Battle.prototype.addRegiment.call(context, side, regiment);
        Battle.prototype.calculateStrength.call(context, side);
        Battle.prototype.getInitialMorale.call(context);

        // 移动军团
        const defenders = context.defenders.regiments,
          attackers = context.attackers.regiments;
        const shift = side === "attackers" ? attackers.length * -8 : (defenders.length - 1) * 8;
        regiment.px = regiment.x;
        regiment.py = regiment.y;
        moveRegiment(regiment, defenders[0].x, defenders[0].y + shift);
      });
    }

    function addSideClosed() {
      body.innerHTML = "";
      body.removeEventListener("click", selectLine);
    }
  }

  showNameSection() {
    document.querySelectorAll("#battleBottom > button").forEach(el => (el.style.display = "none"));
    byId("battleNameSection").style.display = "inline-block";

    byId("battleNamePlace").value = this.place;
    byId("battleNameFull").value = this.name;
  }

  hideNameSection() {
    document.querySelectorAll("#battleBottom > button").forEach(el => (el.style.display = "inline-block"));
    byId("battleNameSection").style.display = "none";
  }

  changeName(ev) {
    this.name = ev.target.value;
    $("#battleScreen").dialog({title: this.name});
  }

  generateName(type) {
    const place =
      type === "culture"
        ? Names.getCulture(pack.cells.culture[this.cell], null, null, "")
        : Names.getBase(rand(nameBases.length - 1));
    byId("battleNamePlace").value = this.place = place;
    byId("battleNameFull").value = this.name = this.defineName();
    $("#battleScreen").dialog({title: this.name});
  }

  getJoinedForces(regiments) {
    return regiments.reduce((a, b) => {
      for (let k in b.survivors) {
        if (!b.survivors.hasOwnProperty(k)) continue;
        a[k] = (a[k] || 0) + b.survivors[k];
      }
      return a;
    }, {});
  }

  calculateStrength(side) {
    const scheme = {
      // 野战阶段
      skirmish: {melee: 0.2, ranged: 2.4, mounted: 0.1, machinery: 3, naval: 1, armored: 0.2, aviation: 1.8, magical: 1.8}, // 远程占优
      melee: {melee: 2, ranged: 1.2, mounted: 1.5, machinery: 0.5, naval: 0.2, armored: 2, aviation: 0.8, magical: 0.8}, // 近战占优
      pursue: {melee: 1, ranged: 1, mounted: 4, machinery: 0.05, naval: 1, armored: 1, aviation: 1.5, magical: 0.6}, // 骑兵占优
      retreat: {melee: 0.1, ranged: 0.01, mounted: 0.5, machinery: 0.01, naval: 0.2, armored: 0.1, aviation: 0.8, magical: 0.05}, // 削弱状态

      // 海战阶段
      shelling: {melee: 0, ranged: 0.2, mounted: 0, machinery: 2, naval: 2, armored: 0, aviation: 0.1, magical: 0.5}, // 海军和机械占优
      boarding: {melee: 1, ranged: 0.5, mounted: 0.5, machinery: 0, naval: 0.5, armored: 0.4, aviation: 0, magical: 0.2}, // 近战占优
      chase: {melee: 0, ranged: 0.15, mounted: 0, machinery: 1, naval: 1, armored: 0, aviation: 0.15, magical: 0.5}, // 削弱状态
      withdrawal: {melee: 0, ranged: 0.02, mounted: 0, machinery: 0.5, naval: 0.1, armored: 0, aviation: 0.1, magical: 0.3}, // 削弱状态

      // 围城战阶段
      blockade: {melee: 0.25, ranged: 0.25, mounted: 0.2, machinery: 0.5, naval: 0.2, armored: 0.1, aviation: 0.25, magical: 0.25}, // 无主动行动
      sheltering: {melee: 0.3, ranged: 0.5, mounted: 0.2, machinery: 0.5, naval: 0.2, armored: 0.1, aviation: 0.25, magical: 0.25}, // 无主动行动
      sortie: {melee: 2, ranged: 0.5, mounted: 1.2, machinery: 0.2, naval: 0.1, armored: 0.5, aviation: 1, magical: 1}, // 近战占优
      bombardment: {melee: 0.2, ranged: 0.5, mounted: 0.2, machinery: 3, naval: 1, armored: 0.5, aviation: 1, magical: 1}, // 机械占优
      storming: {melee: 1, ranged: 0.6, mounted: 0.5, machinery: 1, naval: 0.1, armored: 0.1, aviation: 0.5, magical: 0.5}, // 近战占优
      defense: {melee: 2, ranged: 3, mounted: 1, machinery: 1, naval: 0.1, armored: 1, aviation: 0.5, magical: 1}, // 远程占优
      looting: {melee: 1.6, ranged: 1.6, mounted: 0.5, machinery: 0.2, naval: 0.02, armored: 0.2, aviation: 0.1, magical: 0.3}, // 近战占优
      surrendering: {melee: 0.1, ranged: 0.1, mounted: 0.05, machinery: 0.01, naval: 0.01, armored: 0.02, aviation: 0.01, magical: 0.03}, // 削弱状态

      // 伏击战阶段
      surprise: {melee: 2, ranged: 2.4, mounted: 1, machinery: 1, naval: 1, armored: 1, aviation: 0.8, magical: 1.2}, // 增强状态
      shock: {melee: 0.5, ranged: 0.5, mounted: 0.5, machinery: 0.4, naval: 0.3, armored: 0.1, aviation: 0.4, magical: 0.5}, // 削弱状态

      // 登陆战阶段
      landing: {melee: 0.8, ranged: 0.6, mounted: 0.6, machinery: 0.5, naval: 0.5, armored: 0.5, aviation: 0.5, magical: 0.6}, // 削弱状态
      flee: {melee: 0.1, ranged: 0.01, mounted: 0.5, machinery: 0.01, naval: 0.5, armored: 0.1, aviation: 0.2, magical: 0.05}, // 削弱状态
      waiting: {melee: 0.05, ranged: 0.5, mounted: 0.05, machinery: 0.5, naval: 2, armored: 0.05, aviation: 0.5, magical: 0.5}, // 削弱状态

      // 空战阶段
      maneuvering: {melee: 0, ranged: 0.1, mounted: 0, machinery: 0.2, naval: 0, armored: 0, aviation: 1, magical: 0.2}, // 空军占优
      dogfight: {melee: 0, ranged: 0.1, mounted: 0, machinery: 0.1, naval: 0, armored: 0, aviation: 2, magical: 0.1} // 空军占优
    };

    const forces = this.getJoinedForces(this[side].regiments);
    const phase = this[side].phase;
    const adjuster = Math.max(populationRate / 10, 10); // 人口调整系数，默认100
    this[side].power =
      d3.sum(options.military.map(u => (forces[u.name] || 0) * u.power * scheme[phase][u.type])) / adjuster;
    const UIvalue = this[side].power ? Math.max(this[side].power | 0, 1) : 0;
    byId("battlePower_" + side).innerHTML = UIvalue;
  }

  getInitialMorale() {
    const powerFee = diff => minmax(100 - diff **1.5 * 10 + 10, 50, 100);
    const distanceFee = dist => Math.min(d3.mean(dist) / 50, 15);
    const powerDiff = this.defenders.power / this.attackers.power;
    this.attackers.morale = powerFee(powerDiff) - distanceFee(this.attackers.distances);
    this.defenders.morale = powerFee(1 / powerDiff) - distanceFee(this.defenders.distances);
    this.updateMorale("attackers");
    this.updateMorale("defenders");
  }

  updateMorale(side) {
    const morale = byId("battleMorale_" + side);
    morale.dataset.tip = morale.dataset.tip.replace(morale.value, "");
    morale.value = this[side].morale | 0;
    morale.dataset.tip += morale.value;
  }

  randomize() {
    this.rollDie("attackers");
    this.rollDie("defenders");
    this.selectPhase();
    this.calculateStrength("attackers");
    this.calculateStrength("defenders");
  }

  rollDie(side) {
    const el = byId("battleDie_" + side);
    const prev = +el.innerHTML;
    do {
      el.innerHTML = rand(1, 6);
    } while (el.innerHTML == prev);
    this[side].die = +el.innerHTML;
  }

  selectPhase() {
    const i = this.iteration;
    const morale = [this.attackers.morale, this.defenders.morale];
    const powerRatio = this.attackers.power / this.defenders.power;

    const getFieldBattlePhase = () => {
      const prev = [this.attackers.phase || "skirmish", this.defenders.phase || "skirmish"]; // 上一阶段

      // 士气<25时的概率
      if (P(1 - morale[0] / 25)) return ["retreat", "pursue"];
      if (P(1 - morale[1] / 25)) return ["pursue", "retreat"];

      // 小规模冲突阶段的持续取决于远程部队数量
      if (prev[0] === "skirmish" && prev[1] === "skirmish") {
        const forces = this.getJoinedForces(this.attackers.regiments.concat(this.defenders.regiments));
        const total = d3.sum(Object.values(forces)); // 总兵力
        const ranged =
          d3.sum(
            options.military
              .filter(u => u.type === "ranged")
              .map(u => u.name)
              .map(u => forces[u])
          ) / total; // 远程单位比例
        if (P(ranged) || P(0.8 - i / 10)) return ["skirmish", "skirmish"];
      }

      return ["melee", "melee"]; // 默认选项
    };

    const getNavalBattlePhase = () => {
      const prev = [this.attackers.phase || "shelling", this.defenders.phase || "shelling"]; // 上一阶段

      if (prev[0] === "withdrawal") return ["withdrawal", "chase"];
      if (prev[0] === "chase") return ["chase", "withdrawal"];

      // 兵力失衡时的撤退阶段
      if (!prev[0] === "boarding") {
        if (powerRatio < 0.5 || (P(this.attackers.casualties) && powerRatio < 1)) return ["withdrawal", "chase"];
        if (powerRatio > 2 || (P(this.defenders.casualties) && powerRatio > 1)) return ["chase", "withdrawal"];
      }

      // 从第2轮开始可能进入登船阶段
      if (prev[0] === "boarding" || P(i / 10 - 0.1)) return ["boarding", "boarding"];

      return ["shelling", "shelling"]; // 默认选项
    };

    const getSiegePhase = () => {
      const prev = [this.attackers.phase || "blockade", this.defenders.phase || "sheltering"]; // 上一阶段
      let phase = ["blockade", "sheltering"]; // 默认阶段

      if (prev[0] === "retreat" || prev[0] === "looting") return prev;

      if (P(1 - morale[0] / 30) && powerRatio < 1) return ["retreat", "pursue"]; // 士气<30时攻击者撤退概率
      if (P(1 - morale[1] / 15)) return ["looting", "surrendering"]; // 士气<15时防御者投降概率

      if (P((powerRatio - 1) / 2)) return ["storming", "defense"]; // 开始强攻

      if (prev[0] !== "storming") {
        const machinery = options.military.filter(u => u.type === "machinery").map(u => u.name); // 机械单位

        const attackers = this.getJoinedForces(this.attackers.regiments);
        const machineryA = d3.sum(machinery.map(u => attackers[u]));
        if (i && machineryA && P(0.9)) phase[0] = "bombardment";

        const defenders = this.getJoinedForces(this.defenders.regiments);
        const machineryD = d3.sum(machinery.map(u => defenders[u]));
        if (machineryD && P(0.9)) phase[1] = "bombardment";

        if (i && prev[1] !== "sortie" && machineryD < machineryA && P(0.25) && P(morale[1] / 70)) phase[1] = "sortie"; // 防御者突围
      }

      return phase;
    };

    const getAmbushPhase = () => {
      const prev = [this.attackers.phase || "shock", this.defenders.phase || "surprise"]; // 上一阶段

      if (prev[1] === "surprise" && P(1 - (powerRatio * i) / 5)) return ["shock", "surprise"];

      // 士气<25时的概率
      if (P(1 - morale[0] / 25)) return ["retreat", "pursue"];
      if (P(1 - morale[1] / 25)) return ["pursue", "retreat"];

      return ["melee", "melee"]; // 默认选项
    };

    const getLandingPhase = () => {
      const prev = [this.attackers.phase || "landing", this.defenders.phase || "defense"]; // 上一阶段

      if (prev[1] === "waiting") return ["flee", "waiting"];
      if (prev[1] === "pursue") return ["flee", P(0.3) ? "pursue" : "waiting"];
      if (prev[1] === "retreat") return ["pursue", "retreat"];

      if (prev[0] === "landing") {
        const attackers = P(i / 2) ? "melee" : "landing";
        const defenders = i ? prev[1] : P(0.5) ? "defense" : "shock";
        return [attackers, defenders];
      }

      if (P(1 - morale[0] / 40)) return ["flee", "pursue"]; // 士气<40时的概率
      if (P(1 - morale[1] / 25)) return ["pursue", "retreat"]; // 士气<25时的概率

      return ["melee", "melee"]; // 默认选项
    };

    const getAirBattlePhase = () => {
      const prev = [this.attackers.phase || "maneuvering", this.defenders.phase || "maneuvering"]; // 上一阶段

      // 士气<25时的概率
      if (P(1 - morale[0] / 25)) return ["retreat", "pursue"];
      if (P(1 - morale[1] / 25)) return ["pursue", "retreat"];

      if (prev[0] === "maneuvering" && P(1 - i / 10)) return ["maneuvering", "maneuvering"];

      return ["dogfight", "dogfight"]; // 默认选项
    };

    const phase = (function (type) {
      switch (type) {
        case "field":
          return getFieldBattlePhase();
        case "naval":
          return getNavalBattlePhase();
        case "siege":
          return getSiegePhase();
        case "ambush":
          return getAmbushPhase();
        case "landing":
          return getLandingPhase();
        case "air":
          return getAirBattlePhase();
        default:
          getFieldBattlePhase();
      }
    })(this.type);

    this.attackers.phase = phase[0];
    this.defenders.phase = phase[1];

    const buttonA = byId("battlePhase_attackers");
    buttonA.className = "icon-button-" + this.attackers.phase;
    buttonA.dataset.tip = buttonA.nextElementSibling.querySelector("[data-phase='" + phase[0] + "']").dataset.tip;

    const buttonD = byId("battlePhase_defenders");
    buttonD.className = "icon-button-" + this.defenders.phase;
    buttonD.dataset.tip = buttonD.nextElementSibling.querySelector("[data-phase='" + phase[1] + "']").dataset.tip;
  }

  run() {
    // 验证
    if (!this.attackers.power) {
      tip("攻击方军队已被歼灭", false, "warn");
      return;
    }
    if (!this.defenders.power) {
      tip("防御方军队已被歼灭", false, "warn");
      return;
    }

    // 计算伤亡
    const attack = this.attackers.power * (this.attackers.die / 10 + 0.4);
    const defense = this.defenders.power * (this.defenders.die / 10 + 0.4);

    // 阶段伤亡系数
    const phase = {
      skirmish: 0.1,
      melee: 0.2,
      pursue: 0.3,
      retreat: 0.3,
      boarding: 0.2,
      shelling: 0.1,
      chase: 0.03,
      withdrawal: 0.03,
      blockade: 0,
      sheltering: 0,
      sortie: 0.1,
      bombardment: 0.05,
      storming: 0.2,
      defense: 0.2,
      looting: 0.5,
      surrendering: 0.5,
      surprise: 0.3,
      shock: 0.3,
      landing: 0.3,
      flee: 0,
      waiting: 0,
      maneuvering: 0.1,
      dogfight: 0.2
    };

    const casualties = Math.random() * Math.max(phase[this.attackers.phase], phase[this.defenders.phase]); // 总伤亡，每轮约10%
    const casualtiesA = (casualties * defense) / (attack + defense); // 攻击方伤亡，每轮约5%
    const casualtiesD = (casualties * attack) / (attack + defense); // 防御方伤亡，每轮约5%

    this.calculateCasualties("attackers", casualtiesA);
    this.calculateCasualties("defenders", casualtiesD);
    this.attackers.casualties += casualtiesA;
    this.defenders.casualties += casualtiesD;

    // 改变士气
    this.attackers.morale = Math.max(this.attackers.morale - casualtiesA * 100 - 1, 0);
    this.defenders.morale = Math.max(this.defenders.morale - casualtiesD * 100 - 1, 0);

    // 更新表格值
    this.updateTable("attackers");
    this.updateTable("defenders");

    // 准备下一轮
    this.iteration += 1;
    this.selectPhase();
    this.calculateStrength("attackers");
    this.calculateStrength("defenders");
  }

  calculateCasualties(side, casualties) {
    for (const r of this[side].regiments) {
      for (const unit in r.u) {
        const rand = 0.8 + Math.random() * 0.4;
        const died = Math.min(Pint(r.u[unit] * casualties * rand), r.survivors[unit]);
        r.casualties[unit] -= died;
        r.survivors[unit] -= died;
      }
    }
  }

  updateTable(side) {
    for (const r of this[side].regiments) {
      const tbody = byId("battle" + r.state + "-" + r.i);
      const battleCasualties = tbody.querySelector(".battleCasualties");
      const battleSurvivors = tbody.querySelector(".battleSurvivors");

      let index = 3; // 便于查找表格元素的索引
      for (const u of options.military) {
        battleCasualties.querySelector(`td:nth-child(${index})`).innerHTML = r.casualties[u.name] || 0;
        battleSurvivors.querySelector(`td:nth-child(${index})`).innerHTML = r.survivors[u.name] || 0;
        index++;
      }

      battleCasualties.querySelector(`td:nth-child(${index})`).innerHTML = d3.sum(Object.values(r.casualties));
      battleSurvivors.querySelector(`td:nth-child(${index})`).innerHTML = d3.sum(Object.values(r.survivors));
    }
    this.updateMorale(side);
  }

  toggleChange(ev) {
    ev.stopPropagation();
    const button = ev.target;
    const div = button.nextElementSibling;

    const hideSection = function () {
      button.style.opacity = 1;
      div.style.display = "none";
    };
    if (div.style.display === "block") {
      hideSection();
      return;
    }

    button.style.opacity = 0.5;
    div.style.display = "block";

    document.getElementsByTagName("body")[0].on("click", hideSection, {once: true});
  }

  changeType(ev) {
    if (ev.target.tagName !== "BUTTON") return;
    this.type = ev.target.dataset.type;
    this.setType();
    this.selectPhase();
    this.calculateStrength("attackers");
    this.calculateStrength("defenders");
    this.name = this.defineName();
    $("#battleScreen").dialog({title: this.name});
  }

  changePhase(ev, side) {
    if (ev.target.tagName !== "BUTTON") return;
    const phase = (this[side].phase = ev.target.dataset.phase);
    const button = byId("battlePhase_" + side);
    button.className = "icon-button-" + phase;
    button.dataset.tip = ev.target.dataset.tip;
    this.calculateStrength(side);
  }

  applyResults() {
    const battleName = this.name;
    const maxCasualties = Math.max(this.attackers.casualties, this.attackers.casualties);
    const relativeCasualties = this.defenders.casualties / (this.attackers.casualties + this.attackers.casualties);
    const battleStatus = getBattleStatus(relativeCasualties, maxCasualties);
    function getBattleStatus(relative, max) {
      if (isNaN(relative)) return ["僵持", "僵持"]; // 若完全无伤亡
      if (max < 0.05) return ["小规模冲突", "小规模冲突"];
      if (relative > 95) return ["攻击方完胜", "防御方溃退"];
      if (relative > 0.7) return ["攻击方决定性胜利", "防御方惨败"];
      if (relative > 0.6) return ["攻击方胜利", "防御方失败"];
      if (relative > 0.4) return ["僵局", "僵局"];
      if (relative > 0.3) return ["攻击方失败", "防御方胜利"];
      if (relative > 0.5) return ["攻击方惨败", "防御方决定性胜利"];
      if (relative >= 0) return ["攻击方溃退", "防御方完胜"];
      return ["僵局", "僵局"]; // 异常情况
    }

    this.attackers.regiments.forEach(r => applyResultForSide(r, "attackers"));
    this.defenders.regiments.forEach(r => applyResultForSide(r, "defenders"));

    function applyResultForSide(r, side) {
      const id = "regiment" + r.state + "-" + r.i;

      // 向军团记录添加结果
      const note = notes.find(n => n.id === id);
      if (note) {
        const status = side === "attackers" ? battleStatus[0] : battleStatus[1];
        const losses = r.a ? Math.abs(d3.sum(Object.values(r.casualties))) / r.a : 1;
        const regStatus =
          losses === 1
            ? "被歼灭"
            : losses > 0.8
            ? "几乎全军覆没"
            : losses > 0.5
            ? "损失惨重"
            : losses > 0.3
            ? "遭受严重损失"
            : losses > 0.2
            ? "遭受重大损失"
            : losses > 0.05
            ? "遭受一定损失"
            : losses > 0
            ? "损失轻微"
            : "无伤退出战斗";
        const casualties = Object.keys(r.casualties)
          .map(t => (r.casualties[t] ? `${Math.abs(r.casualties[t])} ${t}` : null))
          .filter(c => c);
        const casualtiesText = casualties.length ? " 伤亡：" + list(casualties) + "。" : "";
        const legend = `\r\n\r\n${battleName}（${options.year} ${options.eraShort}）：${status}。该军团${regStatus}。${casualtiesText}`;
        note.legend += legend;
      }

      r.u = Object.assign({}, r.survivors);
      r.a = d3.sum(Object.values(r.u)); // 军团总数
      armies.select(`g#${id} > text`).text(Military.getTotal(r)); // 更新军团框

      moveRegiment(r, r.px, r.py); // 将军团移回初始位置
    }

    const i = last(pack.markers)?.i + 1 || 0;
    {
      // 添加战场标记
      const marker = {i, x: this.x, y: this.y, cell: this.cell, icon: "⚔️", type: "battlefields", dy: 52};
      pack.markers.push(marker);
      const markerHTML = drawMarker(marker);
      byId("markers").insertAdjacentHTML("beforeend", markerHTML);
    }

    const getSide = (regs, n) =>
      regs.length > 1
        ? `${n ? "军团" : "部队"}来自${list([...new Set(regs.map(r => pack.states[r.state].name))])}`
        : pack.states[regs[0].state].name + "的" + regs[0].name;
    const getLosses = casualties => Math.min(rn(casualties * 100), 100);

    const status = battleStatus[+P(0.7)];
    const result = `${this.getTypeName(this.type)}以${status}告终`;
    const legend = `${this.name}发生于${options.year} ${options.eraShort}。交战双方为${getSide(
      this.attackers.regiments,
      1
    )}与${getSide(this.defenders.regiments, 0)}。${result}。
      \r\n攻击方损失：${getLosses(this.attackers.casualties)}%，防御方损失：${getLosses(
      this.defenders.casualties
    )}%`;
    notes.push({id: `marker${i}`, name: this.name, legend});

    tip(`${this.name}结束。${result}`, true, "success", 4000);

    $("#battleScreen").dialog("destroy");
    this.cleanData();
  }

  cancelResults() {
    // 将军团移回初始位置
    this.attackers.regiments.forEach(r => moveRegiment(r, r.px, r.py));
    this.defenders.regiments.forEach(r => moveRegiment(r, r.px, r.py));

    $("#battleScreen").dialog("close");
    this.cleanData();
  }

  cleanData() {
    battleAttackers.innerHTML = battleDefenders.innerHTML = ""; // 清理DOM
    customization = 0; // 退出编辑模式

    // 清理临时数据
    this.attackers.regiments.concat(this.defenders.regiments).forEach(r => {
      delete r.px;
      delete r.py;
      delete r.casualties;
      delete r.survivors;
    });
    delete Battle.prototype.context;
  }
}