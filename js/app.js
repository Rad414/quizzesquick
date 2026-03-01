// Функция инициализации страницы создания викторины
function initCreator() {
  const addBtn = document.getElementById('add-question');
  const saveBtn = document.getElementById('save-quiz');
  const container = document.getElementById('questions-container');

  if (!addBtn || !saveBtn || !container) {
    console.error('Не найдены необходимые элементы DOM');
    return;
  }

  // Обработчик добавления вопроса
  addBtn.addEventListener('click', () => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-form';
    const uniqueId = Date.now();

    questionDiv.innerHTML = `
      <h3>Вопрос</h3>
      <input type="text" class="question-text" placeholder="Введите вопрос..." required>
      <div>
        <input type="text" class="answer-text" placeholder="Вариант ответа 1" required>
        <input type="radio" name="correct-${uniqueId}" class="correct-radio" value="0">
        <label>Правильный</label>
      </div>
      <div>
        <input type="text" class="answer-text" placeholder="Вариант ответа 2" required>
        <input type="radio" name="correct-${uniqueId}" class="correct-radio" value="1">
        <label>Правильный</label>
      </div>
      <button type="button" class="delete-btn">Удалить вопрос</button>
    `;

    container.appendChild(questionDiv);

    // Обработчик удаления вопроса
    const deleteBtn = questionDiv.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
      questionDiv.remove();
    });
  });

  // Обработчик сохранения викторины
  saveBtn.addEventListener('click', () => {
    const title = document.getElementById('title').value.trim();
    const topic = document.getElementById('topic').value.trim();

    if (!title || !topic) {
      alert('Пожалуйста, заполните название и тему викторины!');
      return;
    }

    const questions = [];
    document.querySelectorAll('.question-form').forEach(q => {
      const qText = q.querySelector('.question-text').value.trim();
      const answers = Array.from(q.querySelectorAll('.answer-text'))
        .map(input => input.value.trim());
      const correctIndex = parseInt(q.querySelector('.correct-radio:checked')?.value || -1);

      if (qText && answers.every(a => a) && correctIndex !== -1) {
        questions.push({
          question: qText,
          answers: answers,
          correct: correctIndex
        });
      }
    });

    if (questions.length === 0) {
      alert('Добавьте хотя бы один вопрос с заполненными полями!');
      return;
    }

    // Создаём объект викторины
    const quiz = {
      id: Date.now().toString(),
      title: title,
      topic: topic,
      questions: questions
    };

    // Сохраняем в localStorage
    localStorage.setItem('currentQuiz', JSON.stringify(quiz));

    // Формируем ссылку для прохождения с данными викторины
    try {
      const encryptedData = btoa(encodeURIComponent(JSON.stringify(quiz)));
      const quizUrl = `${window.location.origin}${window.location.pathname.replace('creator.html', 'quiz.html')}?quiz=${encryptedData}`;

      // Показываем ссылку пользователю
      const linkContainer = document.getElementById('share-link-container');
      if (linkContainer) {
        linkContainer.innerHTML = `
          <p>Викторина сохранена! Поделитесь этой ссылкой:</p>
          <input type="text" value="${quizUrl}" readonly style="width: 100%; padding: 8px; margin: 5px 0;">
          <button onclick="copyToClipboard('${quizUrl}')" class="btn">Копировать ссылку</button>
        `;
      } else {
        console.warn('Элемент #share-link-container не найден');
        alert(`Викторина сохранена! Ссылка: ${quizUrl}`);
      }
    } catch (error) {
      console.error('Ошибка при создании ссылки:', error);
      alert('Не удалось создать ссылку. Викторина сохранена в браузере.');
    }
  });
}

// Функция инициализации страницы прохождения викторины
function initQuiz() {
  const quizDisplay = document.getElementById('quiz-display');
  const resultArea = document.getElementById('result-area');

  if (!quizDisplay || !resultArea) {
    console.error('Не найдены элементы для отображения викторины');
    return;
  }

  // Проверяем, есть ли данные викторины в URL
  const urlParams = new URLSearchParams(window.location.search);
  const encryptedQuiz = urlParams.get('quiz');

  if (encryptedQuiz) {
    try {
      // Декодируем данные
      const decodedData = decodeURIComponent(atob(encryptedQuiz));
      const quiz = JSON.parse(decodedData);

      // Отображаем викторину
      renderQuiz(quiz, quizDisplay, resultArea);
    } catch (error) {
      console.error('Ошибка загрузки викторины:', error);
      quizDisplay.innerHTML = '<p>Не удалось загрузить викторину. Проверьте ссылку.</p>';
    }
  } else {
    // Если нет данных в URL, проверяем localStorage
    const savedQuiz = localStorage.getItem('currentQuiz');
    if (savedQuiz) {
      try {
        const quiz = JSON.parse(savedQuiz);
        renderQuiz(quiz, quizDisplay, resultArea);
      } catch (error) {
        console.error('Ошибка чтения из localStorage:', error);
        quizDisplay.innerHTML = '<p>Сохранённая викторина повреждена.</p>';
      }
    } else {
      quizDisplay.innerHTML = '<p>Викторина не найдена. Создайте новую!</p>';
    }
  }
}

// Функция отображения викторины для прохождения
function renderQuiz(quiz, displayElement, resultElement) {
  displayElement.innerHTML = `
    <h2>${quiz.title}</h2>
    <p><strong>Тема:</strong> ${quiz.topic}</p>
    ${quiz.description ? `<p><strong>Описание:</strong> ${quiz.description}</p>` : ''}
    <form id="attempt-form">
      ${quiz.questions.map((q, index) => `
        <div class="quiz-question">
          <h3>${index + 1}. ${q.question}</h3>
          ${q.answers.map((answer, ansIndex) => `
            <div>
              <input type="radio" name="q${index}" id="q${index}-a${ansIndex}" value="${ansIndex}">
              <label for="q${index}-a${ansIndex}">${answer}</label>
            </div>
          `).join('')}
        </div>
      `).join('')}
      <button type="button" id="submit-quiz" class="btn btn-primary">Проверить ответы</button>
    </form>
  `;

  // Обработчик проверки ответов
  const submitBtn = displayElement.querySelector('#submit-quiz');
  submitBtn.addEventListener('click', () => {
    let score = 0;
    quiz.questions.forEach((q, index) => {
      // Функция инициализации страницы прохождения викторины
function initQuiz() {
  const quizDisplay = document.getElementById('quiz-display');
  const resultArea = document.getElementById('result-area');

  if (!quizDisplay || !resultArea) {
    console.error('Не найдены элементы для отображения викторины');
    return;
  }

  // Проверяем, есть ли данные викторины в URL
  const urlParams = new URLSearchParams(window.location.search);
  const encryptedQuiz = urlParams.get('quiz');

  if (encryptedQuiz) {
    try {
      // Декодируем данные
      const decodedData = decodeURIComponent(atob(encryptedQuiz));
      const quiz = JSON.parse(decodedData);

      // Отображаем викторину
      renderQuiz(quiz, quizDisplay, resultArea);
    } catch (error) {
      console.error('Ошибка загрузки викторины:', error);
      quizDisplay.innerHTML = '<p>Не удалось загрузить викторину. Проверьте ссылку.</p>';
    }
  } else {
    // Если нет данных в URL, проверяем localStorage
    const savedQuiz = localStorage.getItem('currentQuiz');
    if (savedQuiz) {
      try {
        const quiz = JSON.parse(savedQuiz);
        renderQuiz(quiz, quizDisplay, resultArea);
      } catch (error) {
        console.error('Ошибка чтения из localStorage:', error);
        quizDisplay.innerHTML = '<p>Сохранённая викторина повреждена.</p>';
      }
    } else {
      quizDisplay.innerHTML = '<p>Викторина не найдена. Создайте новую!</p>';
    }
  }
}

// Функция отображения викторины для прохождения
function renderQuiz(quiz, displayElement, resultElement) {
  displayElement.innerHTML = `
    <h2>${quiz.title}</h2>
    <p><strong>Тема:</strong> ${quiz.topic}</p>
    ${quiz.description ? `<p><strong>Описание:</strong> ${quiz.description}</p>` : ''}
    <form id="attempt-form">
      ${quiz.questions.map((q, index) => `
        <div class="quiz-question">
          <h3>${index + 1}. ${q.question}</h3>
          ${q.answers.map((answer, ansIndex) => `
            <div>
              <input type="radio" name="q${index}" id="q${index}-a${ansIndex}" value="${ansIndex}">
              <label for="q${index}-a${ansIndex}">${answer}</label>
            </div>
          `).join('')}
        </div>
      `).join('')}
      <button type="button" id="submit-quiz" class="btn btn-primary">Проверить ответы</button>
    </form>
  `;

  // Обработчик проверки ответов
  const submitBtn = displayElement.querySelector('#submit-quiz');
  submitBtn.addEventListener('click', () => {
    let score = 0;
    const totalQuestions = quiz.questions.length;

    quiz.questions.forEach((q, index) => {
      const selectedAnswer = document.querySelector(`input[name="q${index}"]:checked`);
      if (selectedAnswer && parseInt(selectedAnswer.value) === q.correct) {
        score++;
      }
    });

    // Показываем результат
    resultElement.innerHTML = `
      <div class="result">
        <h3>Результаты</h3>
        <p>Вы ответили правильно на ${score} из ${totalQuestions} вопросов.</p>
        <p>Оценка: ${Math.round((score / totalQuestions) * 100)}%</p>
        <button onclick="location.reload()" class="btn">Пройти ещё раз</button>
      </div>
    `;
  });
}
// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  if (document.title.includes('Создать')) {
    initCreator();
  } else if (document.title.includes('Прохождение')) {
    initQuiz();
  }
});
