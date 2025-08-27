"use strict";

function editRouteGroups() {
  if (customization) return;
  if (!layerIsOn("toggleRoutes")) toggleRoutes();

  addLines();

  $("#routeGroupsEditor").dialog({
    title: "编辑路线组",
    resizable: false,
    position: {my: "left top", at: "left+10 top+140", of: "#map"}
  });

  if (modules.editRouteGroups) return;
  modules.editRouteGroups = true;

  // add listeners
  byId("routeGroupsEditorAdd").addEventListener("click", addGroup);
  byId("routeGroupsEditorBody").on("click", ev => {
    const group = ev.target.closest(".states")?.dataset.id;
    if (ev.target.classList.contains("editStyle")) editStyle("routes", group);
    else if (ev.target.classList.contains("removeGroup")) removeGroup(group);
  });

  function addLines() {
    byId("routeGroupsEditorBody").innerHTML = "";

    const lines = Array.from(routes.selectAll("g")._groups[0]).map(el => {
      const count = el.children.length;
      return /* html */ `<div data-id="${el.id}" class="states" style="display: flex; justify-content: space-between;">
          <span>${el.id} (${count})</span>
          <div style="width: auto; display: flex; gap: 0.4em;">
            <span data-tip="编辑样式" class="editStyle icon-brush pointer" style="font-size: smaller;"></span>
            <span data-tip="删除组" class="removeGroup icon-trash pointer"></span>
          </div>
        </div>`;
    });

    byId("routeGroupsEditorBody").innerHTML = lines.join("");
  }

  const DEFAULT_GROUPS = ["roads", "trails", "searoutes"];

  function addGroup() {
    prompt("Type group name", {default: "route-group-new"}, v => {
      let group = v
        .toLowerCase()
        .replace(/ /g, "_")
        .replace(/[^\w\s]/gi, "");

      if (!group) return tip("无效的组名", false, "error");
      if (!group.startsWith("route-")) group = "route-" + group;
      if (byId(group)) return tip("此名称的元素已存在。请提供唯一名称", false, "error");
      if (Number.isFinite(+group.charAt(0))) return tip("组名应以字母开头", false, "error");

      routes
        .append("g")
        .attr("id", group)
        .attr("stroke", "#000000")
        .attr("stroke-width", 0.5)
        .attr("stroke-dasharray", "1 0.5")
        .attr("stroke-linecap", "butt");
      byId("routeGroup")?.options.add(new Option(group, group));
      addLines();

      byId("routeCreatorGroupSelect").options.add(new Option(group, group));
    });
  }

  function removeGroup(group) {
    confirmationDialog({
      title: "删除路线组",
      message:
        "确定要删除整个路线组吗？此组中的所有路线都将被删除。<br>此操作无法恢复",
      confirm: "删除",
      onConfirm: () => {
        pack.routes.filter(r => r.group === group).forEach(Routes.remove);
        if (!DEFAULT_GROUPS.includes(group)) routes.select(`#${group}`).remove();
        addLines();
      }
    });
  }
}
