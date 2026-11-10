/*jslint browser */

const ENDPOINT = "https://formcarry.com/s/c6G3XdLo4DB";
const STORAGE_KEY = "feedbackFormData";
const FORM_HASH = "#feedback";
const TEXT_FIELDS = ["fio", "email", "phone", "organization", "message"];

const MESSAGE_OK = "Спасибо! Сообщение отправлено, мы скоро свяжемся с вами.";
const MESSAGE_FAIL = "Не удалось отправить сообщение. Проверьте подключение и попробуйте ещё раз.";

const overlay = document.getElementById("popup");
const box = overlay.querySelector(".popup-box");
const form = document.getElementById("feedback-form");
const statusBox = document.getElementById("form-status");
const submitButton = document.getElementById("submit-button");

// ---------- LocalStorage ----------

function saveForm() {
    const data = {consent: form.elements.consent.checked};
    TEXT_FIELDS.forEach(function (name) {
        data[name] = form.elements[name].value;
    });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (ignore) {
        // хранилище недоступно, работаем без сохранения
    }
}

function restoreForm() {
    let data = null;
    try {
        data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (ignore) {
        data = null;
    }
    if (data === null || typeof data !== "object") {
        return;
    }
    TEXT_FIELDS.forEach(function (name) {
        if (typeof data[name] === "string") {
            form.elements[name].value = data[name];
        }
    });
    form.elements.consent.checked = data.consent === true;
}

function clearSaved() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (ignore) {
        // ничего не делаем
    }
}

// ---------- Сообщения пользователю ----------

function showStatus(kind, text) {
    statusBox.className = "alert py-1 px-2 mb-2 small alert-" + kind;
    statusBox.textContent = text;
    statusBox.hidden = false;
}

function hideStatus() {
    statusBox.hidden = true;
    statusBox.textContent = "";
}

// ---------- Попап и History API ----------

function openPopup() {
    overlay.hidden = false;
    document.body.classList.add("popup-open");
    box.focus();
}

function closePopup() {
    overlay.hidden = true;
    document.body.classList.remove("popup-open");
    hideStatus();
}

// Открытие по клику: добавляем запись в историю и меняем URL.
function showForm() {
    if (window.location.hash !== FORM_HASH) {
        window.history.pushState({popup: true}, "", FORM_HASH);
    }
    openPopup();
}

// Закрытие пользователем: если запись добавляли мы, возвращаемся назад.
function hideForm() {
    if (window.history.state && window.history.state.popup === true) {
        window.history.back();
    } else {
        window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
        );
        closePopup();
    }
}

// Кнопки «Назад» и «Вперёд» в браузере.
function handlePopState() {
    if (window.location.hash === FORM_HASH) {
        openPopup();
    } else {
        closePopup();
    }
}

// ---------- Отправка ----------

function setSending(isSending) {
    submitButton.disabled = isSending;
    submitButton.textContent = isSending
        ? "Отправка..."
        : "Отправить";
}

function handleResult(result) {
    const body = result.body;
    const success = result.ok && (body.code === 200 || body.status === "success");
    if (success) {
        showStatus("success", MESSAGE_OK);
        clearSaved();
        form.reset();
    } else {
        showStatus("danger", body.message || MESSAGE_FAIL);
    }
}

function sendForm(event) {
    event.preventDefault();
    hideStatus();
    setSending(true);

    fetch(ENDPOINT, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
    }).then(function (response) {
        return response.json().then(function (body) {
            return {ok: response.ok, body: body};
        });
    }).then(handleResult).catch(function () {
        showStatus("danger", MESSAGE_FAIL);
    }).then(function () {
        setSending(false);
    });
}

// ---------- Запуск ----------

document.getElementById("open-form").addEventListener("click", showForm);
document.getElementById("close-form").addEventListener("click", hideForm);

overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
        hideForm();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !overlay.hidden) {
        hideForm();
    }
});

window.addEventListener("popstate", handlePopState);
form.addEventListener("input", saveForm);
form.addEventListener("change", saveForm);
form.addEventListener("submit", sendForm);

restoreForm();
if (window.location.hash === FORM_HASH) {
    openPopup();
}