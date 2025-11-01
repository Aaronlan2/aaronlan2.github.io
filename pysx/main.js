// 全局变量，用于跟踪AI翻译请求状态
let isAITranslateRequestInProgress = false;
// 在全局作用域定义abbreviationList变量
let abbreviationList = {};

// 初始化模型选择弹窗
const modelSelectorButton = document.getElementById("modelSelectorButton");
const modelSelectorModal = document.getElementById("modelSelectorModal");
const selectedModelText = document.getElementById("selectedModelText");
const selectedModel = document.getElementById("selectedModel");
const modelOptions = document.querySelectorAll(".model-option");

// 设置默认选中的模型
modelOptions.forEach((option) => {
  if (option.dataset.model === selectedModel.value) {
    option.classList.add("selected");
  }
});

// 点击按钮显示弹窗
modelSelectorButton.addEventListener("click", () => {
  // 点击后移除焦点
  modelSelectorButton.blur();
  // 添加show类
  modelSelectorModal.classList.add("show");
  // 移除closing类
  modelSelectorModal.classList.remove("closing");
});

// 点击模型选项
modelOptions.forEach((option) => {
  option.addEventListener("click", () => {
    // 更新选中状态
    modelOptions.forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");

    // 更新选中的值
    selectedModel.value = option.dataset.model;
    selectedModelText.textContent = option.dataset.model;

    // 关闭弹窗 - 添加关闭动画
    modelSelectorModal.classList.add("closing");
    setTimeout(() => {
      modelSelectorModal.classList.remove("show", "closing");
    }, 200);
  });
});

// 点击弹窗外的区域关闭弹窗
modelSelectorModal.addEventListener("click", (e) => {
  if (e.target === modelSelectorModal) {
    // 添加关闭动画
    modelSelectorModal.classList.add("closing");
    setTimeout(() => {
      modelSelectorModal.classList.remove("show", "closing");
    }, 200);
  }
});

// 点击ESC键关闭弹窗
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modelSelectorModal.classList.contains("show")) {
    modelSelectorModal.classList.remove("show");
  }
});

document.addEventListener("DOMContentLoaded", function () {
  // --- 选项卡逻辑 ---
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");

      // 更新按钮状态
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // 更新内容显示
      tabContents.forEach((content) => {
        content.classList.remove("active");
        if (content.id === `${tabId}Tab`) {
          content.classList.add("active");
        }
      });
    });
  });

  // --- 单词查询相关元素和逻辑 ---
  const inputBox = document.getElementById("inputBox");
  const addButton = document.getElementById("addButton");
  const modal = document.getElementById("addModal");
  const closeModalBtn = document.querySelector(".close");
  const modalDescription = document.getElementById("modalDescription");
  const newDefinitionInput = document.getElementById("newDefinitionInput");
  const submitDefinitionButton = document.getElementById(
    "submitDefinitionButton"
  );
  const resultElement = document.getElementById("resultSection");
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toastText");
  const searchButton = document.getElementById("searchButton");

  let currentQuery = "";

  // 输入框限制
  inputBox.addEventListener("keydown", function (event) {
    const allowedKeys = [
      "Backspace",
      "Tab",
      "Enter",
      "Escape",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedKeys.includes(event.key)) {
      return;
    }
    const isLetter = /^[a-zA-Z]$/.test(event.key);
    const isDigit = /^[0-9]$/.test(event.key);
    if (!isLetter && !isDigit) {
      event.preventDefault();
    }
  });

  inputBox.addEventListener("input", function () {
    this.value = this.value.replace(/[^a-zA-Z0-9]/g, "");
    resultElement.innerHTML =
      '<div class="placeholder-text">查询结果将显示在这里...</div>';
    addButton.classList.remove("show");
    currentQuery = "";
  });

  // --- 查询逻辑优化 (兼容移动端) ---
  // 1. 点击查询按钮
  const handleSearch = () => {
    performSearch();
  };
  searchButton.addEventListener("click", handleSearch);
  searchButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    handleSearch();
  }); // 添加 touchstart 事件

  // 2. 按下回车键
  inputBox.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault(); // 防止表单提交等默认行为
      performSearch();
    }
  });

  // --- 补充释义逻辑 ---
  addButton.addEventListener("click", function () {
    if (currentQuery) {
      modalDescription.innerHTML = `补充 <strong>${currentQuery}</strong> 的释义，经审核后会整理录入进系统。`;
      newDefinitionInput.value = "";
      submitDefinitionButton.classList.remove("success", "error");
      submitDefinitionButton.textContent = "提交";
      modal.classList.add("show");
    }
  });

  closeModalBtn.addEventListener("click", closeModal);
  closeModalBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    closeModal();
  }); // 添加 touchstart 事件

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.classList.contains("show")) {
      closeModal();
    }
  });

  submitDefinitionButton.addEventListener("click", function () {
    const definition = newDefinitionInput.value.trim();
    if (!definition) {
      return;
    }

    submitDefinitionButton.textContent = "提交中...";
    submitDefinitionButton.classList.remove("success", "error");

    setTimeout(() => {
      console.log(`提交释义: ${currentQuery} -> ${definition}`);
      const isSuccess = Math.random() > 0.2;

      if (isSuccess) {
        submitDefinitionButton.classList.remove("error");
        submitDefinitionButton.classList.add("success");
        submitDefinitionButton.textContent = "提交成功!";
        setTimeout(() => {
          closeModal();
        }, 1500);
      } else {
        submitDefinitionButton.classList.remove("success");
        submitDefinitionButton.classList.add("error");
        submitDefinitionButton.textContent = "提交失败";
        setTimeout(() => {
          submitDefinitionButton.textContent = "提交";
        }, 2000);
      }
    }, 1000);
  });
  submitDefinitionButton.addEventListener("touchstart", function (e) {
    // 防止触摸时触发 click 和 touchstart 两次
    e.preventDefault();
    this.click();
  });

  function closeModal() {
    modal.classList.add("closing");
    setTimeout(() => {
      modal.classList.remove("show", "closing");
      newDefinitionInput.value = "";
      submitDefinitionButton.classList.remove("success", "error");
      submitDefinitionButton.textContent = "提交";
    }, 250);
  }

  async function performSearch() {
    let queryText = inputBox.value.trim();
    queryText = queryText.replace(/[^a-zA-Z0-9]/g, "");

    if (!queryText) {
      resultElement.innerHTML =
        '<div class="placeholder-text">请输入有效的字母或数字组合。</div>';
      currentQuery = "";
      addButton.classList.remove("show");
      return;
    }

    inputBox.value = queryText;
    currentQuery = queryText;

    showLoader(resultElement);

    try {
      const response = await fetch(
        "https://lab.magiconch.com/api/nbnhhsh/guess",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: queryText }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      displayResults(data, resultElement);
    } catch (error) {
      console.error("请求失败:", error);
      resultElement.innerHTML =
        '<div class="placeholder-text">查询失败，请稍后再试。</div>';
    } finally {
      hideLoaderAndShowResults(resultElement);
    }
  }

  function showLoader(container) {
    const loaderContainer = document.createElement("div");
    loaderContainer.className = "loader-container";
    loaderContainer.id = "loaderContainer";
    loaderContainer.innerHTML = '<div class="loader"></div>';
    container.innerHTML = "";
    container.appendChild(loaderContainer);
    requestAnimationFrame(() => {
      loaderContainer.classList.add("show");
    });
    addButton.classList.remove("show");
  }

  function hideLoaderAndShowResults(container) {
    const loaderContainer = container.querySelector("#loaderContainer");
    if (loaderContainer) {
      loaderContainer.classList.remove("show");
      setTimeout(() => {
        if (loaderContainer.parentNode === container) {
          container.removeChild(loaderContainer);
        }
        addButton.classList.add("show");
      }, 300);
    } else {
      addButton.classList.add("show");
    }
  }

  function displayResults(data, container) {
    container.innerHTML = "";

    if (!data || data.length === 0 || !data[0].trans) {
      container.insertAdjacentHTML(
        "afterbegin",
        '<div class="placeholder-text">未找到相关结果。</div>'
      );
      return;
    }

    const transArray = data[0].trans;
    if (transArray.length === 0) {
      container.insertAdjacentHTML(
        "afterbegin",
        '<div class="placeholder-text">未找到相关结果。</div>'
      );
      return;
    }

    const fragment = document.createDocumentFragment();
    const itemsToAdd = [];
    transArray.forEach((item) => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "result-item";
      itemDiv.textContent = item;
      itemDiv.addEventListener("click", () => copyToClipboard(item, itemDiv));
      // 移动端优化：添加 touchstart 事件
      itemDiv.addEventListener("touchstart", (e) => {
        // 防止触摸时触发 click 和 touchstart 两次
        e.preventDefault();
        copyToClipboard(item, itemDiv);
      });
      fragment.appendChild(itemDiv);
      itemsToAdd.push(itemDiv);
    });

    container.appendChild(fragment);

    itemsToAdd.forEach((item) => {
      item.offsetHeight; // 强制重排以触发动画
    });
  }

  function copyToClipboard(text, element) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast("复制成功!", "success");
        // 修复标签在复制后消失的问题
        // 移除了原有的元素删除逻辑，保持标签可见
      })
      .catch((err) => {
        console.error("复制失败:", err);
        showToast("复制失败!", "error");
      });
  }

  function showToast(message, type = "info") {
    if (toast.classList.contains("show")) {
      return;
    }

    toastText.textContent = message;

    // 获取 toast 图标元素
    const toastIcon = toast.querySelector(".toast-icon");

    // 根据类型控制图标显示和颜色
    if (type === "success") {
      toastIcon.style.display = "block";
      toastIcon.style.fill = "var(--success-color)";
      toastIcon.innerHTML =
        '<path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM17.4571 9.45711L11 15.9142L6.79289 11.7071L8.20711 10.2929L11 13.0858L16.0429 8.04289L17.4571 9.45711Z"></path>';
    } else if (type === "error") {
      toastIcon.style.display = "block";
      toastIcon.style.fill = "var(--error-color)";
      toastIcon.innerHTML =
        '<path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 10.5858L9.17157 7.75736L7.75736 9.17157L10.5858 12L7.75736 14.8284L9.17157 16.2426L12 13.4142L14.8284 16.2426L16.2426 14.8284L13.4142 12L16.2426 9.17157L14.8284 7.75736L12 10.5858Z"></path>';
    } else {
      toastIcon.style.display = "none";
    }

    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }

  // --- 整句查询逻辑 ---
  const sentenceInput = document.getElementById("sentenceInput");
  const sentenceResultSection = document.getElementById(
    "sentenceResultSection"
  );
  const aiTranslateButton = document.getElementById("aiTranslateButton");
  let debounceTimer;
  let sentenceData = {};

  // 添加自动调整 textarea 高度的函数
  function adjustTextareaHeight() {
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";
  }

  // 初始化时调整一次高度
  adjustTextareaHeight.call(sentenceInput);

  // 监听输入事件，自动调整高度
  sentenceInput.addEventListener("input", adjustTextareaHeight);
  sentenceInput.addEventListener("focus", adjustTextareaHeight);
  sentenceInput.addEventListener("blur", adjustTextareaHeight);

  // 窗口大小改变时也调整高度
  window.addEventListener("resize", () =>
    adjustTextareaHeight.call(sentenceInput)
  );

  // 3. 防抖函数 (模拟 lodash.debounce)
  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // 4. 提取英文单词的函数
  function extractEnglishWords(text) {
    const wordMatches = [];
    const regex = /[a-zA-Z0-9]+/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      wordMatches.push({
        word: match[0],
        index: match.index,
      });
    }

    // 去重但保持顺序
    const uniqueWords = [];
    const seen = new Set();

    for (const item of wordMatches) {
      if (!seen.has(item.word)) {
        seen.add(item.word);
        uniqueWords.push(item);
      }
    }

    // 按出现顺序排序
    uniqueWords.sort((a, b) => a.index - b.index);

    // 返回单词数组
    return uniqueWords.map((item) => item.word);
  }

  // 5. 整句查询处理函数
  async function handleSentenceSearch() {
    const text = sentenceInput.value.trim();
    if (!text) {
      sentenceResultSection.innerHTML =
        '<div class="placeholder-text">请输入包含缩写的句子。</div>';
      return;
    }

    const words = extractEnglishWords(text);
    if (words.length === 0) {
      sentenceResultSection.innerHTML =
        '<div class="placeholder-text">句子中未找到拼音缩写。</div>';
      return;
    }

    sentenceResultSection.innerHTML =
      '<div class="placeholder-text">查询中...</div>';

    const results = {};
    const promises = words.map(async (word) => {
      try {
        const response = await fetch(
          "https://lab.magiconch.com/api/nbnhhsh/guess",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: word }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        results[word] = data[0]?.trans || [];
      } catch (error) {
        console.error(`查询单词 ${word} 失败:`, error);
        results[word] = [];
      }
    });

    await Promise.all(promises);

    // 填充abbreviationList
    abbreviationList = {};
    // 按照句子中单词的出现顺序创建单词位置映射
    const wordPositions = {};
    const regex = /[a-zA-Z0-9]+/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (!wordPositions[match[0]]) {
        wordPositions[match[0]] = match.index;
      }
    }

    // 获取所有单词并按原句中的出现顺序排序
    const sortedWords = Object.keys(results).sort((a, b) => {
      return (wordPositions[a] || Infinity) - (wordPositions[b] || Infinity);
    });

    // 将单词及其释义添加到abbreviationList
    sortedWords.forEach((word) => {
      if (results[word] && results[word].length > 0) {
        abbreviationList[word] = results[word];
      }
    });

    sentenceData = results;
    displaySentenceResults(text, results);
  }

  // 6. 显示整句查询结果
  function displaySentenceResults(originalText, results) {
    sentenceResultSection.innerHTML = "";

    const fragment = document.createDocumentFragment();
    let hasResults = false;

    // 创建单词位置映射
    const wordPositions = {};
    const regex = /[a-zA-Z0-9]+/g;
    let match;

    while ((match = regex.exec(originalText)) !== null) {
      if (!wordPositions[match[0]]) {
        wordPositions[match[0]] = match.index;
      }
    }

    // 获取所有单词并按原句中的出现顺序排序
    const words = Object.keys(results).sort((a, b) => {
      return (wordPositions[a] || Infinity) - (wordPositions[b] || Infinity);
    });

    words.forEach((word) => {
      const transArray = results[word];
      if (transArray && transArray.length > 0) {
        hasResults = true;
        const groupDiv = document.createElement("div");
        groupDiv.className = "word-result-group";

        const labelSpan = document.createElement("span");
        labelSpan.className = "word-label";
        labelSpan.textContent = word;

        const addButton = document.createElement("span");
        addButton.className = "add-icon-button";
        addButton.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z"></path></svg>';
        addButton.addEventListener("click", () => {
          openAddModal(word);
        });

        labelSpan.appendChild(addButton);
        groupDiv.appendChild(labelSpan);

        const resultsDiv = document.createElement("div");
        resultsDiv.className = "word-results";

        transArray.forEach((trans) => {
          const resultItem = document.createElement("div");
          resultItem.className = "result-item";
          resultItem.textContent = trans;
          resultItem.addEventListener("click", () =>
            copyToClipboard(trans, resultItem)
          );

          // 移动端优化：添加 touchstart 事件
          resultItem.addEventListener("touchstart", (e) => {
            // 防止触摸时触发 click 和 touchstart 两次
            e.preventDefault();
            copyToClipboard(trans, resultItem);
          });
          resultsDiv.appendChild(resultItem);
        });

        groupDiv.appendChild(resultsDiv);
        fragment.appendChild(groupDiv);
      }
    });

    if (!hasResults) {
      const noResultDiv = document.createElement("div");
      noResultDiv.className = "placeholder-text";
      noResultDiv.innerHTML =
        '未找到相关结果。 <a href="#" class="no-result-link" onclick="openAddModalForSentence()">点击补充</a>';
      fragment.appendChild(noResultDiv);
    }

    sentenceResultSection.appendChild(fragment);
  }

  // 8. 打开补充释义模态框 (通用)
  function openAddModal(word) {
    modalDescription.innerHTML = `补充 <strong>${word}</strong> 的释义，经审核后会整理录入进系统。`;
    newDefinitionInput.value = "";
    submitDefinitionButton.classList.remove("success", "error");
    submitDefinitionButton.textContent = "提交";
    modal.classList.add("show");
  }

  // 7. 打开补充释义模态框 (整句查询)
  function openAddModalForSentence() {
    const text = sentenceInput.value.trim();
    if (!text) return;

    const words = extractEnglishWords(text);
    if (words.length === 0) return;

    // 这里可以弹出一个选择框让用户选择要补充的单词
    // 为了简化，我们直接补充第一个单词
    const firstWord = words[0];
    openAddModal(firstWord);
  }

  // 9. 事件监听器
  sentenceInput.addEventListener("input", debounce(handleSentenceSearch, 500));

  // --- AI 翻译按钮逻辑 ---
  // 为所有 AI 翻译按钮添加事件监听器
  // --- AI 翻译按钮逻辑 ---
  // 为所有 AI 翻译按钮添加事件监听器
  document.querySelectorAll("#aiTranslateButton").forEach((button) => {
    button.addEventListener("click", async function () {
      // 获取当前 tab 的输入框
      const currentTab = this.closest(".tab-content");
      const inputElement = currentTab.querySelector("input, textarea");
      const text = inputElement.value.trim();

      if (!text) {
        showToast("请输入内容");
        return;
      }

      // 检查是否正在进行AI翻译请求，防止重复请求
      if (isAITranslateRequestInProgress) {
        return;
      }

      // 设置请求状态为进行中
      isAITranslateRequestInProgress = true;

      // 获取结果区域
      const resultSection = currentTab.querySelector(
        "#resultSection, #sentenceResultSection"
      );

      // 清空原有的翻译结果，但保留标签结果
      const existingTranslation = resultSection.querySelector(
        ".translation-result-container"
      );
      if (existingTranslation) {
        existingTranslation.remove();
      }

      // 显示加载动画
      showLoaderForAITranslate(resultSection);

      try {
        // 执行实际的POST请求获取翻译结果
        let translatedText = "";

        // 判断是否为整句查询
        if (currentTab.id === "sentenceTab") {
          // 检查是否已经进行过整句查询（标签区是否有结果）
          const hasExistingResults =
            sentenceResultSection.querySelector(".word-result-group") !== null;

          // 如果没有进行过整句查询，则先调用整句查询逻辑
          if (!hasExistingResults) {
            await handleSentenceSearch();
          }

          // 获取选择的AI模型
          const selectedModelValue =
            document.getElementById("selectedModel").value;

          // 调用指定的API获取翻译结果
          const response = await fetch(
            "https://env-00jxu7ixroxe.api-hz.cloudbasefunction.cn/wlpysxcd",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: `需要翻译的句子：${text}\n\n缩写词释义列表：${JSON.stringify(
                  abbreviationList
                ).replaceAll("\n", "")}`,
                model: selectedModelText.innerText, // 添加选择的模型到请求体
              }),
            }
          );
          console.log(
            `需要翻译的句子：${text}\n\n缩写词释义列表：${JSON.stringify(
              abbreviationList
            ).replaceAll("\n", "")}\n\n选择的模型：${selectedModelText.innerText}`
          );
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          translatedText = await response.text();
        } else {
          // 单词查询：保持原有逻辑
          const response = await fetch(
            "https://lab.magiconch.com/api/nbnhhsh/guess",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: text }),
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (
            data &&
            data.length > 0 &&
            data[0].trans &&
            data[0].trans.length > 0
          ) {
            translatedText = data[0].trans.join("、");
          } else {
            translatedText = "未找到相关翻译结果";
          }
        }

        // 显示翻译结果
        // 检查是否存在加载动画元素，如果有则移除
        const loaderContainer =
          resultSection.querySelector("#aiTranslateLoader");
        if (loaderContainer) {
          loaderContainer.remove();
        }

        // 创建新的翻译结果容器
        const translationContainer = document.createElement("div");
        translationContainer.className = "translation-result-container";
        translationContainer.style.marginBottom = "15px";
        translationContainer.innerHTML = `<div class="ai-text">AI 翻译：${translatedText}</div>`;

        // 在结果区域顶部添加翻译结果，保留原有查询结果
        if (resultSection.firstChild) {
          resultSection.insertBefore(
            translationContainer,
            resultSection.firstChild
          );
        } else {
          resultSection.appendChild(translationContainer);
        }
      } catch (error) {
        console.error("翻译失败:", error);
        // 只在没有任何结果时才显示错误信息
        if (!resultSection.querySelector(".word-result-group")) {
          resultSection.innerHTML =
            '<div class="placeholder-text">翻译失败，请稍后再试。</div>';
        }
        showToast("翻译失败!", "error");
      } finally {
        // 隐藏加载动画
        hideLoaderForAITranslate(resultSection);
        // 设置请求状态为已完成
        isAITranslateRequestInProgress = false;
      }
    });
  });

  // 为AI翻译添加专用的加载动画显示函数
  function showLoaderForAITranslate(container) {
    const loaderContainer = document.createElement("div");
    loaderContainer.className = "loader-container";
    loaderContainer.id = "aiTranslateLoader";
    loaderContainer.innerHTML = '<div class="loader"></div>';

    // 在容器顶部添加加载动画，而不是清空内容
    if (container.firstChild) {
      container.insertBefore(loaderContainer, container.firstChild);
    } else {
      container.appendChild(loaderContainer);
    }

    requestAnimationFrame(() => {
      loaderContainer.classList.add("show");
    });
  }

  // 为AI翻译添加专用的加载动画隐藏函数
  function hideLoaderForAITranslate(container) {
    const loaderContainer = container.querySelector("#aiTranslateLoader");
    if (loaderContainer) {
      loaderContainer.classList.remove("show");
      setTimeout(() => {
        if (loaderContainer.parentNode === container) {
          container.removeChild(loaderContainer);
        }
      }, 300);
    }
  }
});

// 为按钮添加失焦处理
const buttons = document.querySelectorAll(".tooltip");
buttons.forEach(button => {
  button.addEventListener("click", () => {
    // 点击后立即移除焦点
    button.blur();
  });
});
