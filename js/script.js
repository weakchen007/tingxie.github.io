document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements - Tabs
  const tabButtons = document.querySelectorAll(".tab-button")
  const tabPanes = document.querySelectorAll(".tab-pane")

  // DOM Elements - Import & Word List
  const manualInput = document.getElementById("manual-input")
  const addManualBtn = document.getElementById("add-manual")
  const excelFileInput = document.getElementById("excel-file")
  const txtFileInput = document.getElementById("txt-file")
  const wordList = document.getElementById("word-list")
  const clearListBtn = document.getElementById("clear-list")
  const wordCountSpan = document.getElementById("word-count")

  // DOM Elements - Dictation Settings
  const dictationModeSelect = document.getElementById("dictation-mode")
  const dictationTypeSelect = document.getElementById("dictation-type")
  const intervalInput = document.getElementById("interval")
  const intervalValueSpan = document.getElementById("interval-value")
  const voiceSelect = document.getElementById("voice-select")
  const speechRateInput = document.getElementById("speech-rate")
  const rateValueSpan = document.getElementById("rate-value")
  const intervalSetting = document.getElementById("interval-setting")
  const showWordToggle = document.getElementById("show-word")

  // DOM Elements - Player
  const currentWordDisplay = document.getElementById("current-word-display")
  const progressDisplay = document.getElementById("progress-display")
  const progressBarFill = document.getElementById("progress-bar-fill")
  const startBtn = document.getElementById("start-btn")
  const pauseBtn = document.getElementById("pause-btn")
  const repeatBtn = document.getElementById("repeat-btn")
  const prevBtn = document.getElementById("prev-btn")
  const nextBtn = document.getElementById("next-btn")
  const stopBtn = document.getElementById("stop-btn")
  const toggleWordListBtn = document.getElementById("toggle-word-list-btn")
  const currentWordListContainer = document.getElementById("current-word-list-container")
  const currentWordList = document.getElementById("current-word-list")

  // DOM Elements - History
  const historyContainer = document.getElementById("history-container")
  const historyPagination = document.getElementById("history-pagination")
  const itemsPerPageSelect = document.getElementById("items-per-page")

  // DOM Elements - Custom Modal
  const modal = document.getElementById("custom-modal")
  const modalMessage = document.getElementById("modal-message")
  const modalConfirm = document.getElementById("modal-confirm")
  const modalClose = document.getElementsByClassName("close")[0]

  // State variables
  let words = []
  let currentIndex = 0
  let isPlaying = false
  let isPaused = false
  let dictationInterval
  const speechSynthesis = window.speechSynthesis
  let voices = []
  let dictationHistory = []
  let currentHistoryPage = 1
  let itemsPerPage = 5
  let XLSX

  // Initialize
  function init() {
    // Set up tabs
    setupTabs()

    // Load voices
    loadVoices()
    speechSynthesis.onvoiceschanged = loadVoices

    // Update UI
    updateWordCount()
    updateControls()

    // Load history from localStorage
    loadHistory()
    renderHistory()

    // Event listeners for range inputs
    intervalInput.addEventListener("input", function () {
      intervalValueSpan.textContent = this.value
    })

    speechRateInput.addEventListener("input", function () {
      rateValueSpan.textContent = this.value
    })

    // Event listeners for dictation type
    dictationTypeSelect.addEventListener("change", function () {
      if (this.value === "auto") {
        intervalSetting.style.display = "flex"
      } else {
        intervalSetting.style.display = "none"
      }
    })

    // Event listener for items per page
    itemsPerPageSelect.addEventListener("change", function () {
      itemsPerPage = Number.parseInt(this.value)
      currentHistoryPage = 1
      renderHistory()
    })

    // Event listeners for modal
    modalClose.onclick = closeModal
    modalConfirm.onclick = closeModal
    window.onclick = (event) => {
      if (event.target == modal) {
        closeModal()
      }
    }

    // Event listener for toggle word list button
    toggleWordListBtn.addEventListener("click", toggleWordList)
  }

  // Set up tabs
  function setupTabs() {
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        // Remove active class from all buttons and panes
        tabButtons.forEach((btn) => btn.classList.remove("active"))
        tabPanes.forEach((pane) => pane.classList.remove("active"))

        // Add active class to clicked button
        button.classList.add("active")

        // Show corresponding pane
        const tabId = button.getAttribute("data-tab")
        document.getElementById(`${tabId}-tab`).classList.add("active")
      })
    })
  }

  // Load available voices
  function loadVoices() {
    voices = speechSynthesis.getVoices()

    // Clear existing options
    voiceSelect.innerHTML = ""

    // Filter for Chinese voices and exclude Google voices
    const chineseVoices = voices.filter(
      (voice) =>
        (voice.lang.includes("zh") || voice.lang.includes("cmn")) && !voice.name.toLowerCase().includes("google"),
    )

    // If no Chinese voices, use all non-Google voices
    const voicesToUse =
      chineseVoices.length > 0 ? chineseVoices : voices.filter((voice) => !voice.name.toLowerCase().includes("google"))

    // Add voices to select
    voicesToUse.forEach((voice) => {
      const option = document.createElement("option")
      option.value = voice.name
      option.textContent = `${voice.name} (${voice.lang})`
      voiceSelect.appendChild(option)
    })

    // If no voices available, show a message
    if (voicesToUse.length === 0) {
      const option = document.createElement("option")
      option.value = ""
      option.textContent = "没有可用的语音"
      option.disabled = true
      option.selected = true
      voiceSelect.appendChild(option)
    }
  }

  // Parse input text into words
  function parseInputText(text) {
    if (!text.trim()) return []

    // Split by comma or Chinese comma or Chinese pause mark
    return text
      .split(/[,，、]/)
      .map((word) => word.trim())
      .filter((word) => word.length > 0)
  }

  // Add words to the list
  function addWords(newWords) {
    if (newWords.length === 0) return

    // Add new words to the array
    words = [...words, ...newWords]

    // Update the UI
    updateWordList()
    updateWordCount()
  }

  // Update the word list UI
  function updateWordList() {
    wordList.innerHTML = ""

    words.forEach((word, index) => {
      const li = document.createElement("li")
      li.textContent = word

      const deleteBtn = document.createElement("button")
      deleteBtn.innerHTML = "×"
      deleteBtn.title = "删除"
      deleteBtn.addEventListener("click", () => {
        words.splice(index, 1)
        updateWordList()
        updateWordCount()
      })

      li.appendChild(deleteBtn)
      wordList.appendChild(li)
    })
  }

  // Update word count display
  function updateWordCount() {
    wordCountSpan.textContent = `共 ${words.length} 个生字词`
  }

  // Speak a word using the Web Speech API
  function speakWord(word) {
    if (!word) return

    // Cancel any ongoing speech
    speechSynthesis.cancel()

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(word)

    // Set selected voice
    const selectedVoiceName = voiceSelect.value
    const selectedVoice = voices.find((voice) => voice.name === selectedVoiceName)
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    // Set speech rate
    utterance.rate = Number.parseFloat(speechRateInput.value)

    // Add speaking class for animation
    currentWordDisplay.classList.add("speaking")

    // Remove speaking class when done
    utterance.onend = () => {
      currentWordDisplay.classList.remove("speaking")
    }

    // Speak
    speechSynthesis.speak(utterance)
  }

  // Start dictation
  function startDictation() {
    if (words.length === 0) {
      showModal("请先添加生字词！")
      return
    }

    isPlaying = true
    isPaused = false

    // Create a copy of words for this session
    const sessionWords = [...words]

    // Prepare word order
    if (dictationModeSelect.value === "random") {
      // Shuffle the array
      shuffleArray(sessionWords)
    }

    // Reset index
    currentIndex = 0

    // Update UI
    updateControls()
    updateProgress()

    // Render current word list
    renderCurrentWordList(sessionWords)

    // Start playing
    playCurrentWord()

    // If auto mode, set interval
    if (dictationTypeSelect.value === "auto") {
      const intervalSeconds = Number.parseInt(intervalInput.value, 10)
      dictationInterval = setInterval(() => {
        if (!isPaused) {
          nextWord()
        }
      }, intervalSeconds * 1000)
    }

    // Add to history when starting
    const timestamp = new Date()
    const historyEntry = {
      id: Date.now(),
      timestamp: timestamp,
      words: sessionWords,
      mode: dictationModeSelect.value,
      type: dictationTypeSelect.value,
    }

    dictationHistory.unshift(historyEntry)
    saveHistory()
    renderHistory()
  }

  // Play current word
  function playCurrentWord() {
    if (currentIndex >= words.length) {
      stopDictation()
      return
    }

    const currentWord = words[currentIndex]
    currentWordDisplay.textContent = "🔊"
    speakWord(currentWord)

    // Show the word after a short delay if toggle is on
    setTimeout(() => {
      if (showWordToggle.checked) {
        currentWordDisplay.textContent = currentWord
      } else {
        currentWordDisplay.textContent = "看看看！还想看！自己不会写哇！"
      }
    }, 800)

    updateProgress()
    updateCurrentWordHighlight()
  }

  // Move to next word
  function nextWord() {
    if (currentIndex < words.length - 1) {
      currentIndex++
      playCurrentWord()
      updateControls()
    } else {
      // End of list
      stopDictation()
    }
  }

  // Move to previous word
  function prevWord() {
    if (currentIndex > 0) {
      currentIndex--
      playCurrentWord()
      updateControls()
    }
  }

  // Pause dictation
  function pauseDictation() {
    isPaused = !isPaused
    pauseBtn.innerHTML = isPaused
      ? '<span class="btn-icon">▶️</span><span class="btn-text">继续</span>'
      : '<span class="btn-icon">⏸️</span><span class="btn-text">暂停</span>'
  }

  // Stop dictation
  function stopDictation() {
    isPlaying = false
    isPaused = false

    // Clear interval if exists
    if (dictationInterval) {
      clearInterval(dictationInterval)
      dictationInterval = null
    }

    // Reset display
    currentWordDisplay.textContent = "准备开始"
    currentWordDisplay.classList.remove("speaking")

    // Clear current word list highlight
    clearCurrentWordHighlight()

    // Update controls
    updateControls()
  }

  // Update progress display and progress bar
  function updateProgress() {
    progressDisplay.textContent = `${currentIndex + 1} / ${words.length}`

    // Update progress bar
    const progressPercentage = (currentIndex / (words.length - 1)) * 100
    progressBarFill.style.width = `${progressPercentage}%`
  }

  // Update control buttons state
  function updateControls() {
    startBtn.disabled = isPlaying
    pauseBtn.disabled = !isPlaying
    repeatBtn.disabled = !isPlaying
    prevBtn.disabled = !isPlaying || currentIndex === 0
    nextBtn.disabled = !isPlaying || currentIndex === words.length - 1
    stopBtn.disabled = !isPlaying
  }

  // Shuffle array (Fisher-Yates algorithm)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  // Parse Excel file
  function parseExcelFile(file) {
    const reader = new FileReader()

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      try {
        const workbook = XLSX.read(data, { type: "array" })

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // Extract words from the data
        let extractedWords = []

        jsonData.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              if (cell && typeof cell === "string") {
                // Parse each cell
                const cellWords = parseInputText(cell)
                extractedWords = [...extractedWords, ...cellWords]
              } else if (cell && typeof cell === "number") {
                extractedWords.push(cell.toString())
              }
            })
          }
        })

        // Add words to list
        addWords(extractedWords)
      } catch (error) {
        console.error("Error parsing Excel file:", error)
        showModal("Failed to parse Excel file. Please make sure it's a valid Excel file.")
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // Parse TXT file
  function parseTxtFile(file) {
    const reader = new FileReader()

    reader.onload = (e) => {
      const text = e.target.result
      const extractedWords = parseInputText(text)
      addWords(extractedWords)
    }

    reader.readAsText(file)
  }

  // Save history to localStorage
  function saveHistory() {
    // Limit history to 50 entries
    if (dictationHistory.length > 50) {
      dictationHistory = dictationHistory.slice(0, 50)
    }

    localStorage.setItem("dictationHistory", JSON.stringify(dictationHistory))
  }

  // Load history from localStorage
  function loadHistory() {
    const savedHistory = localStorage.getItem("dictationHistory")
    if (savedHistory) {
      dictationHistory = JSON.parse(savedHistory)
    }
  }

  // Render history with pagination
  function renderHistory() {
    // If no history, show empty message
    if (dictationHistory.length === 0) {
      historyContainer.innerHTML = `
                <div class="empty-history">
                    <p>暂无听写历史记录</p>
                </div>
            `
      historyPagination.innerHTML = ""
      return
    }

    // Calculate pagination
    const totalPages = Math.ceil(dictationHistory.length / itemsPerPage)
    const startIndex = (currentHistoryPage - 1) * itemsPerPage
    const endIndex = Math.min(startIndex + itemsPerPage, dictationHistory.length)

    // Get current page items
    const currentPageItems = dictationHistory.slice(startIndex, endIndex)

    // Add batch delete controls
    let historyHTML = `
      <div class="batch-actions">
        <div class="select-all-container">
          <input type="checkbox" id="select-all-checkbox" class="history-checkbox">
          <label for="select-all-checkbox">全选</label>
        </div>
        <button id="batch-delete-btn" class="btn btn-danger" disabled>
          <span class="btn-icon">❌</span>
          <span class="btn-text">批量删除</span>
        </button>
      </div>
    `

    // Render history items
    currentPageItems.forEach((entry) => {
      const date = new Date(entry.timestamp)
      const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`

      const modeText = entry.mode === "sequential" ? "顺序" : "随机"
      const typeText = entry.type === "auto" ? "自动" : "手动"

      historyHTML += `
                <div class="history-batch" data-id="${entry.id}">
                    <div class="batch-header">
                        <div class="checkbox-container">
                          <input type="checkbox" class="history-checkbox" data-id="${entry.id}">
                        </div>
                        <div class="batch-title">${modeText}${typeText}听写 (${entry.words.length}个词)</div>
                        <div class="batch-time">${formattedDate}</div>
                        <button class="btn btn-danger delete-history-btn" data-id="${entry.id}">
                            <span class="btn-icon">❌</span>
                        </button>
                    </div>
                    <div class="batch-words">
                        ${entry.words.map((word) => `<div class="batch-word">${word}</div>`).join("")}
                    </div>
                </div>
            `
    })

    historyContainer.innerHTML = historyHTML

    // Render pagination
    let paginationHTML = ""

    // Previous button
    paginationHTML += `
            <button class="page-btn ${currentHistoryPage === 1 ? "disabled" : ""}" 
                    ${currentHistoryPage === 1 ? "disabled" : ""} 
                    data-page="prev">
                &laquo;
            </button>
        `

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      paginationHTML += `
                <button class="page-btn ${currentHistoryPage === i ? "active" : ""}" 
                        data-page="${i}">
                    ${i}
                </button>
            `
    }

    // Next button
    paginationHTML += `
            <button class="page-btn ${currentHistoryPage === totalPages ? "disabled" : ""}" 
                    ${currentHistoryPage === totalPages ? "disabled" : ""} 
                    data-page="next">
                &raquo;
            </button>
        `

    historyPagination.innerHTML = paginationHTML

    // Add event listeners to pagination buttons
    document.querySelectorAll(".page-btn").forEach((button) => {
      button.addEventListener("click", function () {
        const page = this.getAttribute("data-page")

        if (page === "prev" && currentHistoryPage > 1) {
          currentHistoryPage--
        } else if (page === "next" && currentHistoryPage < totalPages) {
          currentHistoryPage++
        } else if (page !== "prev" && page !== "next") {
          currentHistoryPage = Number.parseInt(page)
        }

        renderHistory()
      })
    })

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-history-btn").forEach((button) => {
      button.addEventListener("click", function() {
        const id = this.getAttribute("data-id")
        deleteHistoryEntry(id)
      })
    })

    // Add event listeners to checkboxes
    const checkboxes = document.querySelectorAll('.history-checkbox')
    const selectAllCheckbox = document.getElementById('select-all-checkbox')
    const batchDeleteBtn = document.getElementById('batch-delete-btn')

    // Add event listener to the "select all" checkbox
    selectAllCheckbox.addEventListener('change', function() {
      const isChecked = this.checked
      checkboxes.forEach(checkbox => {
        if (checkbox !== selectAllCheckbox) {
          checkbox.checked = isChecked
        }
      })
      updateBatchDeleteButtonState()
    })

    // Add event listeners to individual checkboxes
    checkboxes.forEach(checkbox => {
      if (checkbox !== selectAllCheckbox) {
        checkbox.addEventListener('change', function() {
          updateBatchDeleteButtonState()
          
          // Update select all checkbox state
          const allItemCheckboxes = Array.from(checkboxes).filter(c => c !== selectAllCheckbox)
          const allChecked = allItemCheckboxes.every(c => c.checked)
          selectAllCheckbox.checked = allChecked
        })
      }
    })

    // Add event listener to the batch delete button
    batchDeleteBtn.addEventListener('click', batchDeleteEntries)

    // Function to update the batch delete button state
    function updateBatchDeleteButtonState() {
      const anyChecked = Array.from(checkboxes).some(checkbox => 
        checkbox !== selectAllCheckbox && checkbox.checked
      )
      batchDeleteBtn.disabled = !anyChecked
    }
  }

  // Delete history entry
  function deleteHistoryEntry(id) {
    showModal("确定要删除这条听写记录吗？")
    modalConfirm.onclick = () => {
      // Find index of history entry with matching id
      const index = dictationHistory.findIndex(entry => entry.id == id)
      
      if (index !== -1) {
        // Remove the entry from the array
        dictationHistory.splice(index, 1)
        
        // Save updated history to localStorage
        saveHistory()
        
        // Update pagination if necessary (e.g., if we're on the last page and it's now empty)
        const totalPages = Math.ceil(dictationHistory.length / itemsPerPage)
        if (currentHistoryPage > totalPages && totalPages > 0) {
          currentHistoryPage = totalPages
        }
        
        // Re-render the history
        renderHistory()
      }
      
      closeModal()
    }
  }

  // Batch delete selected history entries
  function batchDeleteEntries() {
    const selectedCheckboxes = document.querySelectorAll('.history-checkbox:checked')
    const idsToDelete = Array.from(selectedCheckboxes)
      .filter(checkbox => checkbox.id !== 'select-all-checkbox')
      .map(checkbox => checkbox.getAttribute('data-id'))
    
    if (idsToDelete.length === 0) return
    
    showModal(`确定要删除选中的 ${idsToDelete.length} 条听写记录吗？`)
    modalConfirm.onclick = () => {
      // Filter out the entries to be deleted
      dictationHistory = dictationHistory.filter(entry => !idsToDelete.includes(entry.id.toString()))
      
      // Save updated history to localStorage
      saveHistory()
      
      // Update pagination if necessary
      const totalPages = Math.ceil(dictationHistory.length / itemsPerPage)
      if (currentHistoryPage > totalPages && totalPages > 0) {
        currentHistoryPage = totalPages
      }
      
      // Re-render the history
      renderHistory()
      closeModal()
    }
  }

  // Show custom modal
  function showModal(message) {
    modalMessage.textContent = message
    modal.style.display = "block"
  }

  // Close custom modal
  function closeModal() {
    modal.style.display = "none"
  }

  // Event Listeners
  addManualBtn.addEventListener("click", () => {
    const text = manualInput.value
    const extractedWords = parseInputText(text)
    addWords(extractedWords)
    manualInput.value = ""
  })


  txtFileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      parseTxtFile(this.files[0])
      this.value = ""
    }
  })

  clearListBtn.addEventListener("click", () => {
    showModal("确定要清空所有生字词吗？")
    modalConfirm.onclick = () => {
      words = []
      updateWordList()
      updateWordCount()
      closeModal()
    }
  })

  startBtn.addEventListener("click", startDictation)
  pauseBtn.addEventListener("click", pauseDictation)
  repeatBtn.addEventListener("click", playCurrentWord)
  prevBtn.addEventListener("click", prevWord)
  nextBtn.addEventListener("click", nextWord)
  stopBtn.addEventListener("click", stopDictation)

  // Toggle word display during dictation
  showWordToggle.addEventListener("change", function () {
    if (isPlaying) {
      if (this.checked) {
        currentWordDisplay.textContent = words[currentIndex]
      } else {
        currentWordDisplay.textContent = "不许看！还想着看！"
      }
    }
  })

  // Adjust layout for manual dictation
  dictationTypeSelect.addEventListener("change", function () {
    if (this.value === "manual") {
      document.querySelector(".dictation-settings").classList.add("manual-layout")
    } else {
      document.querySelector(".dictation-settings").classList.remove("manual-layout")
    }
  })

  // Toggle word list visibility
  function toggleWordList() {
    currentWordListContainer.classList.toggle("hidden")
    
    // Update button text
    if (currentWordListContainer.classList.contains("hidden")) {
      toggleWordListBtn.innerHTML = '<span class="btn-icon">📋</span><span class="btn-text">显示词语列表</span>'
    } else {
      toggleWordListBtn.innerHTML = '<span class="btn-icon">📋</span><span class="btn-text">隐藏词语列表</span>'
    }
  }

  // Render current word list
  function renderCurrentWordList(wordsList) {
    // Clear previous content
    currentWordList.innerHTML = ""
    
    // Add each word as a list item
    wordsList.forEach((word, index) => {
      const wordItem = document.createElement("div")
      wordItem.className = "current-word-item"
      wordItem.setAttribute("data-index", index)
      wordItem.textContent = word
      
      currentWordList.appendChild(wordItem)
    })
    
    // Highlight current word
    updateCurrentWordHighlight()
  }

  // Update current word highlight
  function updateCurrentWordHighlight() {
    // Clear all highlights
    clearCurrentWordHighlight()
    
    // Add highlight to current word
    if (isPlaying) {
      const wordItems = currentWordList.querySelectorAll(".current-word-item")
      wordItems.forEach(item => {
        if (parseInt(item.getAttribute("data-index")) === currentIndex) {
          item.classList.add("active")
        }
      })
    }
  }

  // Clear current word highlight
  function clearCurrentWordHighlight() {
    const wordItems = currentWordList.querySelectorAll(".current-word-item")
    wordItems.forEach(item => {
      item.classList.remove("active")
    })
  }

  // Initialize the app
  init()
})
