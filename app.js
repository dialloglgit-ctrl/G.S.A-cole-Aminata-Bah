    // ========== État Global & Initialisation ==========
    let students = [];
    let payments = [];
    let expenses = [];
    let schedule = [];
    let currentImageData = "";
    let currentTrimestre = 1;
    let currentStudentId = null;
    let studentSearchTerm = "";
    let studentClassFilter = "all";
    const ACCESS_CODE = "1524";
    const MAX_PIN_ATTEMPTS = 3;
    const PIN_LOCK_MS = 30 * 1000;
    let pinAttempts = 0;
    let pinLockedUntil = 0;

    // Configuration des matières
    const matieresConfig = [
        { name: "Mathématiques", coeff: 2 },
        { name: "Français", coeff: 2 },
        { name: "Physique-Chimie", coeff: 2 },
        { name: "Histoire-Géographie", coeff: 1 },
        { name: "Biologie", coeff: 1 },
        { name: "Anglais", coeff: 1 },
        { name: "Sport", coeff: 1 }
    ];

    // Initialiser les modals (tolérant si Bootstrap JS ne se charge pas)
    const hasBootstrapModal = typeof bootstrap !== 'undefined' && bootstrap.Modal;
    function createSafeModal(modalId) {
        const element = document.getElementById(modalId);

        if (!element) {
            return { show() {}, hide() {} };
        }

        if (hasBootstrapModal) {
            return new bootstrap.Modal(element);
        }

        return {
            show() {
                element.classList.add('show');
                element.style.display = 'block';
                element.removeAttribute('aria-hidden');
                element.setAttribute('aria-modal', 'true');
                document.body.classList.add('modal-open');
            },
            hide() {
                element.classList.remove('show');
                element.style.display = 'none';
                element.setAttribute('aria-hidden', 'true');
                element.removeAttribute('aria-modal');
                document.body.classList.remove('modal-open');
            }
        };
    }

    const studentModal = createSafeModal('modal-student');
    const paymentModal = createSafeModal('modal-payment');
    const expenseModal = createSafeModal('modal-expense');
    const courseModal = createSafeModal('modal-course');

    // ========== SAUVEGARDE & CHARGEMENT DONNÉES ==========
    function safeParseJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    }

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function getNextMatricule() {
        const currentYear = new Date().getFullYear();
        const maxForYear = students.reduce((maxValue, s) => {
            const mat = String(s.matricule || '');
            const match = mat.match(/^GSA-(\d{4})-(\d{3,})$/);
            if (!match) return maxValue;

            const year = parseInt(match[1], 10);
            const seq = parseInt(match[2], 10);
            if (year !== currentYear || Number.isNaN(seq)) return maxValue;
            return Math.max(maxValue, seq);
        }, 0);

        return `GSA-${currentYear}-${String(maxForYear + 1).padStart(3, '0')}`;
    }

    function loadData() {
        students = safeParseJSON('gsa_students', []);
        payments = safeParseJSON('gsa_payments', []);
        expenses = safeParseJSON('gsa_expenses', []);
        schedule = safeParseJSON('gsa_schedule', []);
    }

    function saveData() {
        localStorage.setItem('gsa_students', JSON.stringify(students));
        localStorage.setItem('gsa_payments', JSON.stringify(payments));
        localStorage.setItem('gsa_expenses', JSON.stringify(expenses));
        localStorage.setItem('gsa_schedule', JSON.stringify(schedule));
    }

    // ========== ACCÈS DIRECT ==========

    function enableAppAccess() {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
            }, 300);
        }

        document.getElementById('sidebar').classList.add('active-auth');
        document.getElementById('main-content').classList.add('active-auth');
        loadData();
        updateDashboard();
        renderSchedule();
        initClock();
    }

    function validatePin() {
        const pinInput = document.getElementById('pin-input');
        if (!pinInput) return;

        const now = Date.now();
        if (pinLockedUntil > now) {
            const remaining = Math.ceil((pinLockedUntil - now) / 1000);
            showErrorMessage(`Trop de tentatives. Réessayez dans ${remaining}s.`);
            return;
        }

        const pin = pinInput.value.trim();
        if (pin === ACCESS_CODE) {
            pinAttempts = 0;
            pinLockedUntil = 0;
            enableAppAccess();
            return;
        }

        pinAttempts += 1;
        if (pinAttempts >= MAX_PIN_ATTEMPTS) {
            pinLockedUntil = now + PIN_LOCK_MS;
            pinAttempts = 0;
            showErrorMessage('Accès temporairement bloqué pendant 30 secondes.');
        } else {
            const left = MAX_PIN_ATTEMPTS - pinAttempts;
            showErrorMessage(`Code invalide. Tentatives restantes: ${left}`);
        }

        pinInput.value = '';
        pinInput.focus();
    }

    function logout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
            location.reload();
        }
    }

    // ========== MESSAGES D'ERREUR/SUCCÈS ==========
    function showMessage(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} position-fixed top-0 start-50 translate-middle-x mt-3`;
        alertDiv.style.zIndex = '9999';
        alertDiv.style.maxWidth = '500px';
        alertDiv.innerHTML = `<i class="bi bi-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${message}`;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }

    function showErrorMessage(msg) { showMessage(msg, 'error'); }
    function showSuccessMessage(msg) { showMessage(msg, 'success'); }

    // ========== NAVIGATION ==========
    function showSection(sectionId, navEl = null) {
        // Masquer toutes les sections
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        
        // Afficher la section demandée
        const targetSection = document.getElementById(`section-${sectionId}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // MAJ du nav actif
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        if (navEl?.classList.contains('nav-item')) {
            navEl.classList.add('active');
        }

        // Charger les données spécifiques selon la section
        switch(sectionId) {
            case 'students': renderStudents(); break;
            case 'dashboard': updateDashboard(); break;
            case 'finances': renderPayments(); break;
            case 'expenses': renderExpenses(); break;
            case 'planning': renderSchedule(); break;
            case 'bulletins': 
                populateStudentSelects();
                renderMatiereRows();
                break;
            case 'documents':
            case 'cards':
                populateStudentSelects();
                break;
        }

        // Fermer sidebar mobile
        if (window.innerWidth < 992) {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('overlay').classList.remove('open');
        }
    }

    function toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('overlay').classList.toggle('open');
    }

    function setActiveNav(sectionId) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }

    // ========== GESTION ÉLÈVES ==========
    function openStudentModal(id = null) {
        document.getElementById('student-form').reset();
        document.getElementById('student-id').value = "";
        document.getElementById('image-preview-box').classList.add('d-none');
        currentImageData = "";

        if (id) {
            const student = students.find(s => s.id == id);
            if (student) {
                document.getElementById('student-id').value = id;
                document.getElementById('student-firstname').value = student.firstname;
                document.getElementById('student-lastname').value = student.lastname;
                document.getElementById('student-class').value = student.class;
                document.getElementById('student-parent').value = student.parent || "";
                document.getElementById('student-phone').value = student.phone || "";
                if (student.photo) {
                    currentImageData = student.photo;
                    document.getElementById('image-preview').src = student.photo;
                    document.getElementById('image-preview-box').classList.remove('d-none');
                }
            }
        }
        studentModal.show();
    }

    function handleImage(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validation de la taille
        if (file.size > 2 * 1024 * 1024) {
            showErrorMessage("La photo ne doit pas dépasser 2MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            currentImageData = ev.target.result;
            document.getElementById('image-preview').src = currentImageData;
            document.getElementById('image-preview-box').classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    }

    function saveStudent(e) {
        e.preventDefault();
        
        const firstname = document.getElementById('student-firstname').value.trim();
        const lastname = document.getElementById('student-lastname').value.trim();
        const studentClass = document.getElementById('student-class').value;

        // Validation
        if (!firstname || !lastname || !studentClass) {
            showErrorMessage("Veuillez remplir tous les champs obligatoires");
            return;
        }

        const id = document.getElementById('student-id').value;
        const studentData = {
            firstname,
            lastname,
            class: studentClass,
            parent: document.getElementById('student-parent').value.trim(),
            phone: document.getElementById('student-phone').value.trim(),
            photo: currentImageData
        };

        if (id) {
            // Mise à jour
            const index = students.findIndex(s => s.id == id);
            if (index >= 0) {
                students[index] = {...students[index], ...studentData};
            }
        } else {
            // Création
            students.push({
                ...studentData,
                id: Date.now(),
                matricule: getNextMatricule(),
                date: new Date().toISOString()
            });
        }

        saveData();
        studentModal.hide();
        renderStudents();
        updateDashboard();
        showSuccessMessage("Élève enregistré avec succès");
    }

    function deleteStudent(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cet élève?')) {
            students = students.filter(s => s.id !== id);
            saveData();
            renderStudents();
            updateDashboard();
            showSuccessMessage("Élève supprimé");
        }
    }

    function renderStudents() {
        const list = document.getElementById('full-students-list');
        const countDisplay = document.getElementById('students-count-display');
        const classFilterEl = document.getElementById('student-class-filter');

        if (!list) return;

        const availableClasses = [...new Set(students.map(s => s.class).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
        if (classFilterEl) {
            const previousValue = classFilterEl.value || studentClassFilter;
            classFilterEl.innerHTML = '<option value="all">Toutes les classes</option>'
                + availableClasses.map(c => `<option value="${c}">${c}</option>`).join('');
            classFilterEl.value = availableClasses.includes(previousValue) || previousValue === 'all' ? previousValue : 'all';
            studentClassFilter = classFilterEl.value;
        }

        const normalizedSearch = normalizeText(studentSearchTerm);
        const filteredStudents = students.filter(s => {
            const classOk = studentClassFilter === 'all' || s.class === studentClassFilter;
            const haystack = normalizeText(`${s.firstname || ''} ${s.lastname || ''} ${s.matricule || ''} ${s.parent || ''}`);
            const searchOk = !normalizedSearch || haystack.includes(normalizedSearch);
            return classOk && searchOk;
        });

        if (countDisplay) {
            const total = students.length;
            countDisplay.innerText = `${filteredStudents.length} élève(s) affiché(s) sur ${total}`;
        }

        if (filteredStudents.length === 0) {
            const emptyMessage = students.length === 0
                ? 'Aucun élève enregistré'
                : 'Aucun élève ne correspond aux filtres';
            list.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">${emptyMessage}</td></tr>`;
            return;
        }

        list.innerHTML = filteredStudents.map(s => `
            <tr>
                <td><span class="badge bg-light text-dark border">${s.matricule}</span></td>
                <td><img src="${s.photo || 'https://via.placeholder.com/40'}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);" alt="${s.firstname}"></td>
                <td class="fw-bold">${s.firstname} ${s.lastname}</td>
                <td><span class="badge bg-light text-navy">${s.class}</span></td>
                <td class="small text-muted">${s.parent || '---'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="openStudentModal(${s.id})" title="Modifier">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent(${s.id})" title="Supprimer">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function handleStudentFilterChange() {
        const searchEl = document.getElementById('student-search');
        const classEl = document.getElementById('student-class-filter');
        studentSearchTerm = searchEl ? searchEl.value.trim() : '';
        studentClassFilter = classEl ? classEl.value : 'all';
        renderStudents();
    }

    function resetStudentFilters() {
        const searchEl = document.getElementById('student-search');
        const classEl = document.getElementById('student-class-filter');
        if (searchEl) searchEl.value = '';
        if (classEl) classEl.value = 'all';
        studentSearchTerm = '';
        studentClassFilter = 'all';
        renderStudents();
    }

    // ========== GESTION BULLETINS ==========
    function setTrimestre(t) {
        currentTrimestre = t;
        document.querySelectorAll('.trim-tab').forEach((btn, i) => {
            btn.classList.toggle('active', (i + 1) === t);
        });
        loadStudentNotes();
    }

    function renderMatiereRows() {
        const container = document.getElementById('notes-list-container');
        if (container) {
            container.innerHTML = matieresConfig.map((m, i) => `
                <div class="note-row-ui">
                    <div class="note-subject-label">${m.name}</div>
                    <div class="d-flex justify-content-center">
                        <div class="note-entry-box">
                            <input type="number" step="0.25" min="0" max="20" class="note-val-input" data-index="${i}" value="0" oninput="recalculateNotes()">
                        </div>
                    </div>
                    <div class="text-center fw-bold fs-5">${m.coeff}</div>
                    <div class="note-pondere" id="total-pondere-${i}">0.00</div>
                </div>
            `).join('');
        }
        recalculateNotes();
    }

    function recalculateNotes() {
        let totalPondere = 0;
        let sumCoeff = 0;

        document.querySelectorAll('.note-val-input').forEach((input, i) => {
            const val = Math.max(0, Math.min(20, parseFloat(input.value) || 0));
            input.value = val;
            const coeff = matieresConfig[i].coeff;
            const pond = val * coeff;
            
            const ponderDiv = document.getElementById(`total-pondere-${i}`);
            if (ponderDiv) ponderDiv.innerText = pond.toFixed(2);
            
            totalPondere += pond;
            sumCoeff += coeff;
        });

        const moy = sumCoeff > 0 ? (totalPondere / sumCoeff) : 0;
        const moyDiv = document.getElementById('moyenne-finale');
        if (moyDiv) {
            moyDiv.innerHTML = `${moy.toFixed(2)} <span>/ 20</span>`;
        }
    }

    function loadStudentNotes() {
        const selectEl = document.getElementById('notes-student-select');
        const studentId = selectEl ? selectEl.value : null;
        
        if (!studentId) {
            document.getElementById('active-student-display').innerText = "Sélectionnez un élève";
            document.querySelectorAll('.note-val-input').forEach(inp => inp.value = 0);
            recalculateNotes();
            return;
        }

        const student = students.find(s => s.id == studentId);
        if (!student) return;

        document.getElementById('active-student-display').innerText = 
            `${student.lastname.toUpperCase()} ${student.firstname} — ${student.class}`;

        const storageKey = `gsa_notes_${studentId}_T${currentTrimestre}`;
        const saved = JSON.parse(localStorage.getItem(storageKey)) || [];

        document.querySelectorAll('.note-val-input').forEach((input, i) => {
            input.value = saved[i] || 0;
        });
        recalculateNotes();
    }

    function saveNotes(buttonEl = null) {
        const studentId = document.getElementById('notes-student-select').value;
        if (!studentId) {
            showErrorMessage("Veuillez sélectionner un élève");
            return;
        }

        const currentNotes = Array.from(document.querySelectorAll('.note-val-input'))
            .map(inp => parseFloat(inp.value) || 0);
        
        const storageKey = `gsa_notes_${studentId}_T${currentTrimestre}`;
        localStorage.setItem(storageKey, JSON.stringify(currentNotes));

        const btn = buttonEl;
        if (!btn) {
            showSuccessMessage("Notes enregistrées");
            return;
        }
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> ENREGISTRÉ';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-purple');
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('btn-success');
            btn.classList.add('btn-purple');
        }, 2000);
        
        showSuccessMessage("Notes enregistrées");
    }

    function resetNotes() {
        if (confirm('Êtes-vous sûr de vouloir réinitialiser les notes?')) {
            document.querySelectorAll('.note-val-input').forEach(inp => inp.value = 0);
            recalculateNotes();
        }
    }

    // ========== PLANNING ==========
    function openCourseModal() {
        document.getElementById('course-form').reset();
        courseModal.show();
    }

    function saveCourse(e) {
        e.preventDefault();
        
        const subject = document.getElementById('course-subject').value.trim();
        const day = document.getElementById('course-day').value;
        const time = document.getElementById('course-time').value;

        if (!subject || !day || !time) {
            showErrorMessage("Veuillez remplir tous les champs");
            return;
        }

        // Vérifier les doublons
        const exists = schedule.some(c => c.day === day && c.time === time);
        if (exists) {
            showErrorMessage("Ce créneau est déjà occupé");
            return;
        }

        const course = {
            id: Date.now(),
            subject,
            day,
            time,
            prof: document.getElementById('course-prof').value.trim(),
            room: document.getElementById('course-room').value.trim()
        };

        schedule.push(course);
        saveData();
        courseModal.hide();
        renderSchedule();
        showSuccessMessage("Cours ajouté au planning");
    }

    function deleteCourse(id) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce cours?')) {
            schedule = schedule.filter(c => c.id !== id);
            saveData();
            renderSchedule();
            showSuccessMessage("Cours supprimé");
        }
    }

    function renderSchedule() {
        // Nettoyer les cellules
        document.querySelectorAll('#timetable td[data-day]').forEach(td => {
            td.innerHTML = '';
            td.style.position = 'relative';
            td.style.minHeight = '80px';
        });

        // Afficher les cours
        schedule.forEach(c => {
            const row = Array.from(document.querySelectorAll('#timetable tr'))
                .find(tr => tr.dataset.time === c.time);
            
            if (row) {
                const cell = row.querySelector(`td[data-day="${c.day}"]`);
                if (cell) {
                    const div = document.createElement('div');
                    div.className = 'course-box';
                    div.innerHTML = `
                        <div>
                            <div class="fw-bold">${c.subject}</div>
                            ${c.prof ? `<div style="font-size: 0.65rem;">Prof: ${c.prof}</div>` : ''}
                            ${c.room ? `<div class="badge bg-white text-dark p-1 mt-1" style="font-size: 0.6rem;">${c.room}</div>` : ''}
                        </div>
                        <i class="bi bi-x-circle-fill delete-course" onclick="deleteCourse(${c.id})"></i>
                    `;
                    cell.appendChild(div);
                }
            }
        });
    }

    // ========== DOCUMENTS (CERTIFICATS) ==========
    function generateCertPreview() {
        const id = document.getElementById('doc-student-select').value;
        const s = students.find(x => x.id == id);
        if (!s) return;

        const today = new Date();
        const dateStr = today.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        document.getElementById('preview-name').innerText = 
            `${s.firstname} ${s.lastname}`.toUpperCase();
        document.getElementById('preview-mat').innerText = s.matricule;
        document.getElementById('preview-class').innerText = s.class;
        document.getElementById('preview-year').innerText = 
            document.getElementById('doc-year').value;
        document.getElementById('preview-date').innerText = dateStr;
    }

    function exportDocToPDF() {
        const studentId = document.getElementById('doc-student-select').value;
        if (!studentId) {
            showErrorMessage("Veuillez sélectionner un élève");
            return;
        }

        const element = document.getElementById('printable-cert');
        const student = students.find(s => s.id == studentId);
        const name = student ? `Certificat_${student.firstname}_${student.lastname}` : 'certificat';

        const opt = {
            margin: 0,
            filename: `${name}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
        showSuccessMessage("PDF généré et téléchargé");
    }

    // ========== CARTES SCOLAIRES ==========
    function generateCardPreview() {
        const id = document.getElementById('card-student-select').value;
        const s = students.find(x => x.id == id);
        if (!s) return;

        document.getElementById('card-preview-name').innerText = 
            `${s.firstname} ${s.lastname}`.toUpperCase();
        document.getElementById('card-preview-class').innerText = s.class;
        document.getElementById('card-preview-mat').innerText = s.matricule;
        document.getElementById('card-preview-img').src = 
            s.photo || 'https://via.placeholder.com/150';
    }

    // ========== FINANCES ==========
    function openPaymentModal() {
        document.getElementById('payment-form').reset();
        paymentModal.show();
    }

    function savePayment(e) {
        e.preventDefault();

        const studentId = document.getElementById('payment-student').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const motif = document.getElementById('payment-motif').value.trim();

        if (!studentId || !amount || !motif) {
            showErrorMessage("Veuillez remplir tous les champs");
            return;
        }

        if (amount <= 0) {
            showErrorMessage("Le montant doit être positif");
            return;
        }

        const student = students.find(s => s.id == studentId);
        payments.push({
            date: new Date().toISOString(),
            studentName: `${student.firstname} ${student.lastname}`,
            matricule: student.matricule,
            amount,
            motif
        });

        saveData();
        paymentModal.hide();
        renderPayments();
        updateDashboard();
        showSuccessMessage(`Paiement de ${amount.toLocaleString()} GNF enregistré`);
    }

    function deletePayment(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce paiement?')) {
            payments.splice(index, 1);
            saveData();
            renderPayments();
            updateDashboard();
            showSuccessMessage("Paiement supprimé");
        }
    }

    function renderPayments() {
        const list = document.getElementById('payments-list');
        if (payments.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Aucun paiement enregistré</td></tr>';
            return;
        }

        list.innerHTML = payments.map((p, i) => `
            <tr>
                <td>${new Date(p.date).toLocaleDateString('fr-FR')}</td>
                <td class="fw-bold">${p.studentName}</td>
                <td><span class="badge bg-info text-white">${p.motif}</span></td>
                <td class="fw-bold text-success">${p.amount.toLocaleString()} GNF</td>
                <td><button class="btn btn-sm btn-outline-danger" onclick="deletePayment(${i})"><i class="bi bi-trash"></i></button></td>
            </tr>
        `).join('');
    }

    // ========== DÉPENSES ==========
    function openExpenseModal() {
        document.getElementById('expense-form').reset();
        expenseModal.show();
    }

    function saveExpense(e) {
        e.preventDefault();

        const label = document.getElementById('expense-label').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-cat').value;

        if (!label || !amount || !category) {
            showErrorMessage("Veuillez remplir tous les champs");
            return;
        }

        if (amount <= 0) {
            showErrorMessage("Le montant doit être positif");
            return;
        }

        expenses.push({
            date: new Date().toISOString(),
            label,
            cat: category,
            amount
        });

        saveData();
        expenseModal.hide();
        renderExpenses();
        updateDashboard();
        showSuccessMessage(`Dépense de ${amount.toLocaleString()} GNF enregistrée`);
    }

    function deleteExpense(index) {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense?')) {
            expenses.splice(index, 1);
            saveData();
            renderExpenses();
            updateDashboard();
            showSuccessMessage("Dépense supprimée");
        }
    }

    function renderExpenses() {
        const list = document.getElementById('expenses-list');
        if (expenses.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">Aucune dépense enregistrée</td></tr>';
            return;
        }

        list.innerHTML = expenses.map((e, i) => `
            <tr>
                <td>${new Date(e.date).toLocaleDateString('fr-FR')}</td>
                <td class="fw-bold">${e.label}</td>
                <td><span class="badge bg-warning text-dark">${e.cat}</span></td>
                <td class="fw-bold text-danger">-${e.amount.toLocaleString()} GNF</td>
                <td><button class="btn btn-sm btn-outline-danger" onclick="deleteExpense(${i})"><i class="bi bi-trash"></i></button></td>
            </tr>
        `).join('');
    }

    // ========== TABLEAU DE BORD ==========
    function updateDashboard() {
        const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const balance = totalIncome - totalExpenses;

        document.getElementById('stat-total-students').innerText = students.length;
        document.getElementById('stat-total-income').innerText = 
            totalIncome.toLocaleString('fr-FR') + " GNF";
        document.getElementById('stat-total-expenses').innerText = 
            totalExpenses.toLocaleString('fr-FR') + " GNF";
        document.getElementById('stat-balance').innerText = 
            balance.toLocaleString('fr-FR') + " GNF";

        const recentStudents = [...students]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        const listHTML = recentStudents.map(s => `
            <tr>
                <td><span class="badge bg-light text-dark">${s.matricule}</span></td>
                <td class="fw-bold">${s.firstname} ${s.lastname}</td>
                <td><span class="badge bg-light text-navy">${s.class}</span></td>
                <td class="small text-muted">${new Date(s.date).toLocaleDateString('fr-FR')}</td>
            </tr>
        `).join('');

        document.getElementById('recent-students-list').innerHTML = listHTML || 
            '<tr><td colspan="4" class="text-center text-muted py-4">Aucun élève enregistré</td></tr>';
    }

    // ========== UTILITAIRES ==========
    function populateStudentSelects() {
        const selects = [
            'doc-student-select',
            'card-student-select',
            'payment-student',
            'notes-student-select'
        ];

        const options = students.length > 0 
            ? students.map(s => `<option value="${s.id}">${s.firstname} ${s.lastname} (${s.matricule})</option>`).join('')
            : '<option>Aucun élève enregistré</option>';

        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<option value="">-- Sélectionner --</option>' + options;
            }
        });

        if (students.length > 0) {
            document.getElementById('doc-student-select').value = students[0].id;
            document.getElementById('card-student-select').value = students[0].id;
            document.getElementById('payment-student').value = students[0].id;
            document.getElementById('notes-student-select').value = students[0].id;
            generateCertPreview();
            generateCardPreview();
            loadStudentNotes();
        }
    }

    function getTodayLongDate() {
        return new Date().toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    function getSchoolPrintHeader(documentTitle, subtitle = '') {
        return `
            <div class="print-doc-header">
                <div class="print-doc-header__col">REPUBLIQUE DE GUINEE<br>Travail - Justice - Solidarité<br>---<br>MEPU-A</div>
                <div class="print-doc-header__center">
                    <img src="https://image.qwenlm.ai/public_source/276cf7d0-467f-4df5-9908-19685ca07cd1/12c39949f-f810-4f38-ab6c-1da56679e0fc.png" alt="Logo GSA">
                    <div class="print-doc-school">G.S.A AMINATA BAH</div>
                    <div class="print-doc-locality">Linsan</div>
                </div>
                <div class="print-doc-header__col">IRE : Kindia<br>Localité : Linsan<br>Date : ${getTodayLongDate()}</div>
            </div>
            <div class="print-title">
                <h1>${documentTitle}</h1>
                ${subtitle ? `<p>${subtitle}</p>` : ''}
            </div>
        `;
    }

    function getSignatureBlock(city = 'Linsan') {
        return `
            <div class="print-signature-block">
                <div class="print-signature-block__date">Fait à ${city}, le ${getTodayLongDate()}</div>
                <div class="print-signature-block__sign">
                    <div class="print-official-stamp" aria-hidden="true">
                        <div class="print-official-stamp__inner">
                            <span>G.S.A</span>
                            <span>AMINATA BAH</span>
                            <span>LINSAN</span>
                        </div>
                    </div>
                    <strong>Le Directeur Général</strong>
                    <div class="print-signature-space"></div>
                    <span class="text-decoration-underline">Dr. BAH Ibrahima</span>
                    <div class="print-signature-caption">Signature et cachet de l'établissement</div>
                </div>
            </div>
        `;
    }

    function openPrintWindow(title, bodyHtml, extraStyles = '', options = {}) {
        const printWin = window.open('', '_blank', 'width=1000,height=800');
        if (!printWin) {
            showErrorMessage('Impossible d\'ouvrir la fenêtre d\'impression');
            return null;
        }

        const {
            pageSize = 'A4',
            orientation = 'portrait',
            margin = '10mm',
            maxWidth = '210mm'
        } = options;

        const headAssets = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
            .map(node => node.outerHTML)
            .join('');

        const baseStyles = `
            <style>
                body {
                    background: white !important;
                    margin: 0;
                    padding: 24px;
                    color: #0f172a;
                }
                .print-shell {
                    max-width: ${maxWidth};
                    margin: 0 auto;
                }
                .print-doc-header {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr 1fr;
                    gap: 16px;
                    align-items: start;
                    border-bottom: 2px solid #0f172a;
                    padding-bottom: 14px;
                    margin-bottom: 18px;
                    font-size: 12px;
                    line-height: 1.45;
                }
                .print-doc-header__col {
                    text-align: center;
                }
                .print-doc-header__center {
                    text-align: center;
                }
                .print-doc-header__center img {
                    width: 58px;
                    height: 58px;
                    object-fit: contain;
                    margin-bottom: 8px;
                }
                .print-doc-school {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0a1628;
                }
                .print-doc-locality {
                    font-size: 13px;
                    color: #475569;
                }
                .print-title {
                    margin-bottom: 18px;
                    text-align: center;
                }
                .print-title h1 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 800;
                    color: #0a1628;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .print-title p {
                    margin: 6px 0 0;
                    color: #64748b;
                    font-size: 14px;
                }
                .print-meta-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 12px;
                    margin-bottom: 18px;
                }
                .print-meta-card {
                    border: 1px solid #cbd5e1;
                    border-radius: 10px;
                    padding: 10px 12px;
                    background: #f8fafc;
                }
                .print-meta-label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    color: #64748b;
                    margin-bottom: 4px;
                }
                .print-meta-value {
                    font-size: 14px;
                    font-weight: 700;
                    color: #0f172a;
                }
                .no-print {
                    display: none !important;
                }
                .card,
                .cert-container {
                    box-shadow: none !important;
                }
                .table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .table td,
                .table th {
                    border: 1px solid #cbd5e1;
                }
                .table-custom td,
                .table-custom th {
                    padding: 10px 12px !important;
                }
                .table-custom thead th {
                    background: #000 !important;
                    color: white !important;
                }
                .footer-moyenne-sticky {
                    margin-top: 24px;
                    break-inside: avoid;
                }
                .print-signature-block {
                    margin-top: 28px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 24px;
                    break-inside: avoid;
                }
                .print-signature-block__date {
                    font-size: 14px;
                    color: #334155;
                }
                .print-signature-block__sign {
                    min-width: 260px;
                    text-align: center;
                    position: relative;
                    padding-left: 76px;
                }
                .print-signature-space {
                    height: 74px;
                }
                .print-signature-caption {
                    margin-top: 8px;
                    font-size: 11px;
                    color: #64748b;
                    letter-spacing: 0.4px;
                }
                .print-official-stamp {
                    position: absolute;
                    top: 28px;
                    left: -2px;
                    width: 78px;
                    height: 78px;
                    border: 2px double rgba(153, 27, 27, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: rgba(153, 27, 27, 0.34);
                    transform: rotate(-14deg);
                    background: rgba(239, 68, 68, 0.015);
                    z-index: 0;
                }
                .print-official-stamp__inner {
                    width: 60px;
                    height: 60px;
                    border: 1px solid rgba(153, 27, 27, 0.28);
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 3px;
                    font-size: 7px;
                    font-weight: 800;
                    line-height: 1.05;
                    text-align: center;
                    padding: 5px;
                    text-transform: uppercase;
                }
                .print-official-stamp__inner span:first-child {
                    font-size: 10px;
                    letter-spacing: 0.6px;
                }
                .print-signature-block__sign strong,
                .print-signature-block__sign .text-decoration-underline,
                .print-signature-caption {
                    position: relative;
                    z-index: 1;
                }
                .planning-print .table-custom {
                    font-size: 12px;
                }
                .planning-print .table-custom td,
                .planning-print .table-custom th {
                    padding: 8px !important;
                    vertical-align: top;
                }
                .planning-print .course-box {
                    margin: 0;
                    padding: 8px;
                }
                .certificate-print .cert-container {
                    width: 190mm;
                    min-height: auto;
                    padding: 14mm;
                    margin: 0 auto;
                    border: none !important;
                }
                .note-row-ui,
                .course-box,
                tr,
                .cert-container {
                    break-inside: avoid;
                }
                @page {
                    size: ${pageSize} ${orientation};
                    margin: ${margin};
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .print-doc-header {
                        page-break-inside: avoid;
                    }
                    .print-official-stamp {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        `;

        printWin.document.open();
        printWin.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title}</title>${headAssets}${baseStyles}${extraStyles}</head><body><div class="print-shell">${bodyHtml}</div></body></html>`);
        printWin.document.close();
        printWin.focus();
        printWin.onload = function() {
            printWin.print();
            printWin.close();
        };

        return printWin;
    }

    function buildBulletinPrintHtml() {
        const studentId = document.getElementById('notes-student-select')?.value;
        if (!studentId) {
            showErrorMessage('Veuillez sélectionner un élève');
            return null;
        }

        const student = students.find(s => s.id == studentId);
        if (!student) {
            showErrorMessage('Élève introuvable');
            return null;
        }

        const notesRows = matieresConfig.map((matiere, index) => {
            const input = document.querySelector(`.note-val-input[data-index="${index}"]`);
            const note = Math.max(0, Math.min(20, parseFloat(input?.value) || 0));
            const points = (note * matiere.coeff).toFixed(2);
            return `
                <tr>
                    <td>${matiere.name}</td>
                    <td>${note.toFixed(2)}</td>
                    <td>${matiere.coeff}</td>
                    <td>${points}</td>
                </tr>
            `;
        }).join('');

        const moyenne = document.getElementById('moyenne-finale')?.textContent?.replace('/ 20', '').trim() || '0.00';
        const trimLabel = `Trimestre ${currentTrimestre}`;
        const moyenneValue = parseFloat(moyenne.replace(',', '.')) || 0;
        const appreciation = moyenneValue >= 16 ? 'Excellent'
            : moyenneValue >= 14 ? 'Très bien'
            : moyenneValue >= 12 ? 'Bien'
            : moyenneValue >= 10 ? 'Assez bien'
            : 'Encouragements requis';

        return `
            ${getSchoolPrintHeader('Bulletin de Notes', `${student.lastname.toUpperCase()} ${student.firstname}`)}
            <div class="print-meta-grid">
                <div class="print-meta-card"><div class="print-meta-label">Élève</div><div class="print-meta-value">${student.firstname} ${student.lastname}</div></div>
                <div class="print-meta-card"><div class="print-meta-label">Classe</div><div class="print-meta-value">${student.class}</div></div>
                <div class="print-meta-card"><div class="print-meta-label">Matricule</div><div class="print-meta-value">${student.matricule}</div></div>
                <div class="print-meta-card"><div class="print-meta-label">Période</div><div class="print-meta-value">${trimLabel}</div></div>
            </div>
            <table class="table table-custom">
                <thead>
                    <tr><th>Matière</th><th>Note / 20</th><th>Coeff.</th><th>Points</th></tr>
                </thead>
                <tbody>${notesRows}</tbody>
            </table>
            <div class="footer-moyenne-sticky">
                <div>
                    <div class="small fw-bold text-uppercase opacity-75">Moyenne Générale</div>
                    <div class="moyenne-val-ui">${moyenne} <span>/ 20</span></div>
                </div>
                <div>
                    <div class="small fw-bold text-uppercase opacity-75">Appréciation</div>
                    <div class="moyenne-val-ui" style="font-size:1.4rem;">${appreciation}</div>
                </div>
            </div>
            ${getSignatureBlock()}
        `;
    }

    function printDoc(type = 'section') {
        if (type === 'certificate') {
            const certEl = document.getElementById('printable-cert');
            if (!certEl) return;
            openPrintWindow(
                'Certificat de scolarité',
                `<div class="certificate-print">${certEl.outerHTML}</div>`,
                '',
                { pageSize: 'A4', orientation: 'portrait', margin: '8mm', maxWidth: '210mm' }
            );
            return;
        }

        if (type === 'planning') {
            const timetable = document.getElementById('timetable');
            if (!timetable) return;
            const planningHtml = `
                <div class="planning-print">
                    ${getSchoolPrintHeader('Planning Hebdomadaire', 'Emploi du temps scolaire')}
                    <div class="card border-0 overflow-hidden shadow-sm">${timetable.outerHTML}</div>
                    ${getSignatureBlock()}
                </div>
            `;
            openPrintWindow('Planning hebdomadaire', planningHtml, '', {
                pageSize: 'A4',
                orientation: 'landscape',
                margin: '8mm',
                maxWidth: '297mm'
            });
            return;
        }

        if (type === 'bulletin') {
            const bulletinHtml = buildBulletinPrintHtml();
            if (!bulletinHtml) return;
            openPrintWindow('Bulletin de notes', bulletinHtml, '', {
                pageSize: 'A4',
                orientation: 'portrait',
                margin: '10mm',
                maxWidth: '210mm'
            });
            return;
        }

        window.print();
    }

    function getActiveSectionId() {
        const activeSection = document.querySelector('.section.active');
        return activeSection?.id?.replace('section-', '') || 'dashboard';
    }

    function printActiveSection() {
        const sectionId = getActiveSectionId();

        switch (sectionId) {
            case 'documents':
                printDoc('certificate');
                break;
            case 'planning':
                printDoc('planning');
                break;
            case 'bulletins':
                printDoc('bulletin');
                break;
            case 'cards':
                printCard();
                break;
            default:
                printDoc('section');
                break;
        }
    }

    function downloadHtmlAsPdf(filename, htmlContent, options = {}) {
        const temp = document.createElement('div');
        temp.style.position = 'fixed';
        temp.style.left = '-99999px';
        temp.style.top = '0';
        temp.style.background = '#fff';
        temp.style.padding = '0';
        temp.innerHTML = htmlContent;
        document.body.appendChild(temp);

        const opt = {
            margin: 0,
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            ...options
        };

        return html2pdf().set(opt).from(temp).save().then(() => {
            temp.remove();
        }).catch((err) => {
            temp.remove();
            throw err;
        });
    }

    function exportBulletinToPDF() {
        const studentId = document.getElementById('notes-student-select')?.value;
        if (!studentId) {
            showErrorMessage('Veuillez sélectionner un élève');
            return;
        }

        const student = students.find(s => s.id == studentId);
        const bulletinHtml = buildBulletinPrintHtml();
        if (!bulletinHtml) return;

        const filename = student
            ? `Bulletin_${student.firstname}_${student.lastname}_T${currentTrimestre}.pdf`
            : `Bulletin_T${currentTrimestre}.pdf`;

        downloadHtmlAsPdf(filename, `<div style="width:210mm; padding:10mm;">${bulletinHtml}</div>`)
            .then(() => showSuccessMessage('Bulletin téléchargé'))
            .catch(() => showErrorMessage('Impossible de générer le PDF du bulletin'));
    }

    function exportPlanningToPDF() {
        const timetable = document.getElementById('timetable');
        if (!timetable) return;

        const html = `
            <div style="width:297mm; padding:8mm;" class="planning-print">
                ${getSchoolPrintHeader('Planning Hebdomadaire', 'Emploi du temps scolaire')}
                <div class="card border-0 overflow-hidden shadow-sm">${timetable.outerHTML}</div>
                ${getSignatureBlock()}
            </div>
        `;

        downloadHtmlAsPdf('Planning_Hebdomadaire.pdf', html, {
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        })
            .then(() => showSuccessMessage('Planning téléchargé'))
            .catch(() => showErrorMessage('Impossible de générer le PDF du planning'));
    }

    function exportCardToPDF() {
        const cardEl = document.getElementById('printable-card');
        if (!cardEl) return;

        const studentId = document.getElementById('card-student-select')?.value;
        if (!studentId) {
            showErrorMessage('Veuillez choisir un élève');
            return;
        }

        const student = students.find(s => s.id == studentId);
        const filename = student
            ? `Carte_${student.firstname}_${student.lastname}.pdf`
            : 'Carte_Scolaire.pdf';

        const html = `
            <div style="width:210mm; min-height:297mm; display:flex; align-items:center; justify-content:center; background:#fff;">
                ${cardEl.outerHTML}
            </div>
        `;

        downloadHtmlAsPdf(filename, html)
            .then(() => showSuccessMessage('Carte téléchargée'))
            .catch(() => showErrorMessage('Impossible de générer le PDF de la carte'));
    }

    function downloadActiveSection() {
        const sectionId = getActiveSectionId();

        switch (sectionId) {
            case 'documents':
                exportDocToPDF();
                break;
            case 'planning':
                exportPlanningToPDF();
                break;
            case 'bulletins':
                exportBulletinToPDF();
                break;
            case 'cards':
                exportCardToPDF();
                break;
            default:
                exportData();
                break;
        }
    }

    function exportData() {
        const notesEntries = {};
        Object.keys(localStorage)
            .filter(key => key.startsWith('gsa_notes_'))
            .forEach(key => {
                notesEntries[key] = localStorage.getItem(key);
            });

        const payload = {
            version: '1.1',
            exportedAt: new Date().toISOString(),
            data: { students, payments, expenses, schedule },
            notes: notesEntries
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `gsa-backup-${date}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showSuccessMessage('Sauvegarde exportée');
    }

    function triggerImportData() {
        const input = document.getElementById('import-data-input');
        if (input) {
            input.value = '';
            input.click();
        }
    }

    function importData(e) {
        const file = e?.target?.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                const imported = parsed?.data || parsed;

                if (!Array.isArray(imported.students)
                    || !Array.isArray(imported.payments)
                    || !Array.isArray(imported.expenses)
                    || !Array.isArray(imported.schedule)) {
                    throw new Error('Structure invalide');
                }

                students = imported.students;
                payments = imported.payments;
                expenses = imported.expenses;
                schedule = imported.schedule;
                saveData();

                Object.keys(localStorage)
                    .filter(key => key.startsWith('gsa_notes_'))
                    .forEach(key => localStorage.removeItem(key));

                if (parsed.notes && typeof parsed.notes === 'object') {
                    Object.entries(parsed.notes).forEach(([key, value]) => {
                        if (key.startsWith('gsa_notes_') && typeof value === 'string') {
                            localStorage.setItem(key, value);
                        }
                    });
                }

                updateDashboard();
                renderStudents();
                renderPayments();
                renderExpenses();
                renderSchedule();
                populateStudentSelects();
                showSuccessMessage('Données importées avec succès');
            } catch {
                showErrorMessage('Fichier de sauvegarde invalide');
            }
        };
        reader.readAsText(file, 'utf-8');
    }

    function printCard() {
        const cardEl = document.getElementById('printable-card');
        if (!cardEl) return;
        const studentId = document.getElementById('card-student-select').value;
        if (!studentId) { showErrorMessage('Veuillez choisir un élève'); return; }
        const cardHtml = cardEl.outerHTML;
        const printWin = window.open('', '_blank', 'width=400,height=300');
        if (!printWin) {
            showErrorMessage('Impossible d\'ouvrir la fenêtre d\'impression');
            return;
        }

        printWin.document.open();
        printWin.document.write('<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Carte Scolaire</title></head><body></body></html>');
        printWin.document.close();

        const style = printWin.document.createElement('style');
        style.textContent = "* { font-family: Arial, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }"
            + " body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }"
            + " .card-student { width: 85.6mm; height: 54mm; background: white; border: 1px solid #c8a84e; border-radius: 4mm; overflow: hidden; position: relative; }"
            + " .card-header-student { background: #0a1628; color: white; height: 15mm; display: flex; align-items: center; padding: 0 4mm; gap: 3mm; font-size: 9pt; font-weight: bold; }"
            + " .card-body-student { display: flex; padding: 3mm; gap: 4mm; height: 31mm; }"
            + " .card-photo { width: 24mm; height: 28mm; background: #eee; border-radius: 2mm; object-fit: cover; }"
            + " .card-info { flex: 1; font-size: 8pt; line-height: 1.2; }"
            + " .card-footer-student { background: #0a1628; color: #c8a84e; height: 8mm; position: absolute; bottom: 0; width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 4mm; font-size: 7pt; font-weight: bold; }"
            + " @media print { @page { margin: 0; size: 85.6mm 54mm; } body { margin: 0; } }";
        printWin.document.head.appendChild(style);
        printWin.document.body.innerHTML = cardHtml;

        printWin.document.close();
        printWin.focus();
        printWin.onload = function() { printWin.print(); printWin.close(); };
    }

    // ========== HORLOGE NUMÉRIQUE ==========
    function initClock() {
        const updateClock = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('fr-FR');
            const dateStr = now.toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });

            const clockEl = document.getElementById('digital-clock');
            if (clockEl) clockEl.innerText = timeStr;

            const dateEl = document.getElementById('current-date');
            if (dateEl) dateEl.innerText = dateStr;
        };

        updateClock();
        setInterval(updateClock, 1000);
    }

    // ========== INITIALISATION ==========
    document.addEventListener('DOMContentLoaded', () => {
        const pinInput = document.getElementById('pin-input');
        if (pinInput) {
            pinInput.focus();
            pinInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    validatePin();
                }
            });
        }
    });

    // Gestion des touches de raccourci
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key === 'e') {
            if (!document.getElementById('main-content')?.classList.contains('active-auth')) {
                return;
            }
            e.preventDefault();
            showSection('students');
            setActiveNav('students');
        }
    });

