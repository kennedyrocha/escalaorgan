// -----------------------------------------
// Firebase Config (COLE O SEU AQUI)
// -----------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyAeyMRXjtms6g6yadXUAFSsCm1jurx-Cvw",
    authDomain: "escaladata-753ae.firebaseapp.com",
    databaseURL: "https://escaladata-753ae-default-rtdb.firebaseio.com",
    projectId: "escaladata-753ae",
    storageBucket: "escaladata-753ae.firebasestorage.app",
    messagingSenderId: "185170724202",
    appId: "1:185170724202:web:6ebb33922ec5b196371113"
};

// -----------------------------------------
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
// -----------------------------------------

(function () {
    const CAPACITY = 10;

    const DEFAULT_SHIFTS = [
        { "id": "shift-1", "label": "17 de Janeiro de 2026 - 21 Março 2026" },
        { "id": "shift-2", "label": "21 de Março de 2026 - 16 de Maio de 2026" },
        { "id": "shift-3", "label": "16 de Maio de 2026 - 18 de Julho de 2026" },
        { "id": "shift-4", "label": "18 de Julho de 2026 - 19 de Setembro de 2026" },
        { "id": "shift-5", "label": "19 de Setembro de 2026 - 21 de Novembro de 2026" },
        { "id": "shift-6", "label": "21 de Novembro de 2026 - 19 de Janeiro de 2027" }
    ];

    let state = {
        capacity: CAPACITY,
        shifts: {}
    };

    DEFAULT_SHIFTS.forEach(s => {
        state.shifts[s.id] = { id: s.id, label: s.label, participants: [] };
    });

    const $form = document.getElementById('registrationForm');
    const $name = document.getElementById('name');
    const $shift = document.getElementById('shift');
    const $msg = document.getElementById('formMessage');
    const $grid = document.getElementById('shiftsGrid');

    const $modal = document.getElementById('participantsModal');
    const $modalTitle = document.getElementById('modalTitle');
    const $participantsList = document.getElementById('participantsList');

    // ------------------------
    // Load data from Firebase
    // ------------------------
    function subscribeRealtime() {
        db.ref("escala").on("value", snapshot => {
            const val = snapshot.val();

            if (val) {
                state = val;
            } else {
                // first time → push default data
                db.ref("escala").set(state);
            }
            Object.values(state.shifts).forEach(s => {
                if (!s.participants) s.participants = [];
            });
            renderShiftSelect();
        });
    }

    function saveToFirebase() {
        return db.ref("escala").set(state);
    }

    // ------------------------
    // Rendering
    // ------------------------
    function renderShiftSelect() {
        $shift.innerHTML = "";
        Object.values(state.shifts).forEach(s => {
            const count = s.participants.length;
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = `${s.label} (${count}/${state.capacity})`;
            if (count >= state.capacity) {
                opt.disabled = true;
                opt.textContent += " - Vagas preenchidas";
            }
            $shift.appendChild(opt);
        });
    }

    function closeModal() {
        $modal.setAttribute("aria-hidden", "true");
    }

    function showMessage(t, type) {
        $msg.textContent = t;
        $msg.className = "form-message " + (type || "");
    }

    // ------------------------
    // Events
    // ------------------------
    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeModal();
    });

    $form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = ($name.value || "").trim();
        const shiftId = $shift.value;

        if (name.length < 2) {
            showMessage("Digite um nome válido.", "error");
            return;
        }

        const s = state.shifts[shiftId];
        if (!s) {
            showMessage("Escala inválida.", "error");
            return;
        }

        if (s.participants.length >= state.capacity) {
            showMessage("Essa escala já atingiu o limite.", "error");
            return;
        }

        const exists = s.participants.some(p => p.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            showMessage("Esse nome já está nessa escala.", "error");
            return;
        }

        s.participants.push({ name, ts: Date.now() });

        await saveToFirebase();

        showMessage("", "");
        openSuccessModal(name, s.label);
        $form.reset();
    });

    function openSuccessModal(name, shiftLabel) {
        document.getElementById("successText").innerHTML =
            `${name} <br>foi cadastrado(a) na escala de<br> ${shiftLabel}`;

        document.getElementById("successModal")
            .setAttribute("aria-hidden", "false");
    }


    // Start realtime sync
    subscribeRealtime();
})();


function closeSuccessModal() {
    document.getElementById("successModal")
        .setAttribute("aria-hidden", "true");
}