"use strict";

function editNotes(id, name) {
    // 元素
    const notesLegend = byId("notesLegend");
    const notesName = byId("notesName");
    const notesSelect = byId("notesSelect");
    const notesPin = byId("notesPin");

    // 更新对象列表
    notesSelect.options.length = 0;
    notes.forEach(({id}) => notesSelect.options.add(new Option(id, id)));

    // 更新固定笔记图标
    const notesArePinned = options.pinNotes;
    if (notesArePinned) notesPin.classList.add("pressed");
    else notesPin.classList.remove("pressed");

    // 选择一个对象
    if (notes.length || id) {
        if (!id) id = notes[0].id;
        let note = notes.find(note => note.id === id);
        if (!note) {
            if (!name) name = id;
            note = {id, name, legend: ""};
            notes.push(note);
            notesSelect.options.add(new Option(id, id));
        }

        notesSelect.value = id;
        notesName.value = note.name;
        notesLegend.innerHTML = note.legend;
        initEditor();
        updateNotesBox(note);
    } else {
        // 如果笔记数组为空
        notesName.value = "";
        notesLegend.innerHTML = "未添加笔记。点击一个元素（例如标签或标记）并添加自由文本笔记";
    }

    $("#notesEditor").dialog({
        title: "笔记编辑器",
        width: svgWidth * 0.8,
        height: svgHeight * 0.75,
        position: {my: "center", at: "center", of: "svg"},
        close: removeEditor
    });

    if (modules.editNotes) return;
    modules.editNotes = true;

    // 添加监听器
    byId("notesSelect").addEventListener("change", changeElement);
    byId("notesName").addEventListener("input", changeName);
    byId("notesLegend").addEventListener("blur", updateLegend);
    byId("notesPin").addEventListener("click", toggleNotesPin);
    byId("notesFocus").addEventListener("click", validateHighlightElement);
    byId("notesGenerateWithAi").addEventListener("click", openAiGenerator);
    byId("notesDownload").addEventListener("click", downloadLegends);
    byId("notesUpload").addEventListener("click", () => legendsToLoad.click());
    byId("legendsToLoad").addEventListener("change", function () {
        uploadFile(this, uploadLegends);
    });
    byId("notesRemove").addEventListener("click", triggerNotesRemove);

    async function initEditor() {
        if (!window.tinymce) {
            const url = "https://azgaar.github.io/Fantasy-Map-Generator/libs/tinymce/tinymce.min.js";
            try {
                await import(url);
            } catch (error) {
                // 错误可能是由于请求失败被缓存，尝试使用随机哈希再次请求
                try {
                    const hash = Math.random().toString(36).substring(2, 15);
                    await import(`${url}#${hash}`);
                } catch (error) {
                    console.error(error);
                }
            }
        }

        if (window.tinymce) {
            window.tinymce._setBaseUrl("https://azgaar.github.io/Fantasy-Map-Generator/libs/tinymce");
            tinymce.init({
                license_key: "gpl",
                selector: "#notesLegend",
                height: "90%",
                menubar: false,
                plugins: `autolink lists link charmap code fullscreen image link media table wordcount`,
                toolbar: `code | undo redo | removeformat | bold italic strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | fontselect fontsizeselect | blockquote hr charmap | print fullscreen`,
                media_alt_source: false,
                media_poster: false,
                browser_spellcheck: true,
                contextmenu: false,
                setup: editor => {
                    editor.on("Change", updateLegend);
                }
            });
        }
    }

    function updateLegend() {
        const note = notes.find(note => note.id === notesSelect.value);
        if (!note) return tip("未找到笔记元素", true, "error", 4000);

        const isTinyEditorActive = window.tinymce?.activeEditor;
        note.legend = isTinyEditorActive? tinymce.activeEditor.getContent() : notesLegend.innerHTML;
        updateNotesBox(note);
    }

    function updateNotesBox(note) {
        byId("notesHeader").innerHTML = note.name;
        byId("notesBody").innerHTML = note.legend;
    }

    function changeElement() {
        const note = notes.find(note => note.id === this.value);
        if (!note) return tip("未找到笔记元素", true, "error", 4000);

        notesName.value = note.name;
        notesLegend.innerHTML = note.legend;
        updateNotesBox(note);

        if (window.tinymce) tinymce.activeEditor.setContent(note.legend);
    }

    function changeName() {
        const note = notes.find(note => note.id === notesSelect.value);
        if (!note) return tip("未找到笔记元素", true, "error", 4000);

        note.name = this.value;
    }

    function validateHighlightElement() {
        const element = byId(notesSelect.value);
        if (element) return highlightElement(element, 3);

        confirmationDialog({
            title: "元素未找到",
            message: "未找到笔记元素。你想删除该笔记吗？",
            confirm: "删除",
            cancel: "保留",
            onConfirm: removeLegend
        });
    }

    function openAiGenerator() {
        const note = notes.find(note => note.id === notesSelect.value);

        let prompt = `以描述性内容回复。使用简洁平实的语言。虚构一些事实、名称和细节。拆分成段落并格式化为HTML。去除h标签，去除markdown格式。`;
        if (note?.name) prompt += ` 名称: ${note.name}。`;
        if (note?.legend) prompt += ` 数据: ${note.legend}`;

        const onApply = result => {
            notesLegend.innerHTML = result;
            if (note) {
                note.legend = result;
                updateNotesBox(note);
                if (window.tinymce) tinymce.activeEditor.setContent(note.legend);
            }
        };

        generateWithAi(prompt, onApply);
    }

    function downloadLegends() {
        const notesData = JSON.stringify(notes);
        const name = getFileName("笔记") + ".txt";
        downloadFile(notesData, name);
    }

    function uploadLegends(dataLoaded) {
        if (!dataLoaded) return tip("无法加载文件。请检查数据格式", false, "error");
        notes = JSON.parse(dataLoaded);
        notesSelect.options.length = 0;
        editNotes(notes[0].id, notes[0].name);
    }

    function triggerNotesRemove() {
        function removeLegend() {
            notes = notes.filter(({id}) => id!== notesSelect.value);

            if (!notes.length) {
                $("#notesEditor").dialog("close");
                return;
            }

            removeEditor();
            editNotes(notes[0].id, notes[0].name);
        }

        confirmationDialog({
            title: "删除笔记",
            message: "你确定要删除所选笔记吗？此操作无法撤销",
            confirm: "删除",
            onConfirm: removeLegend
        });
    }

    function toggleNotesPin() {
        options.pinNotes =!options.pinNotes;
        this.classList.toggle("pressed");
    }

    function removeEditor() {
        if (window.tinymce) tinymce.remove();
    }
}