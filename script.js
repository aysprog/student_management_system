const API_URL = "https://jsonplaceholder.typicode.com/users";

const studentGrid = document.getElementById("studentGrid");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const emptyMessage = document.getElementById("emptyMessage");
const searchInput = document.getElementById("searchInput");
const studentModal = document.getElementById("studentModal");
const emailModal = document.getElementById("emailModal");
const studentForm = document.getElementById("studentForm");
const emailForm = document.getElementById("emailForm");
const saveButton = document.getElementById("saveButton");
const emailSaveButton = document.getElementById("emailSaveButton");

let students = [];
let isLoading = false;
let currentPage = 1;
const pageSize = 6;

async function getStudents() {
    isLoading = true;
    loadingMessage.classList.remove("hidden");
    errorMessage.classList.add("hidden");
    emptyMessage.classList.add("hidden");
    studentGrid.innerHTML = "";
    updateStats();

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Unable to fetch students");
        }

        const data = await response.json();

        const savedData = localStorage.getItem("studentHubData");
        const apiStudents = data.map(student => ({
            ...student,
            address: student.address || { city: "Not provided" }
        }));
        students = savedData ? JSON.parse(savedData) : apiStudents;
        updateCityOptions();
        renderStudents();
    } catch (error) {
        console.error("GET error:", error);
        errorMessage.classList.remove("hidden");
        document.getElementById("footerCount").textContent = "Unable to load directory";
    } finally {
        isLoading = false;
        loadingMessage.classList.add("hidden");
        updateStats();
    }
}

function renderStudents() {
    const searchText = searchInput.value.trim().toLowerCase();

    const selectedCity = document.getElementById("cityFilter").value;
    const sortValue = document.getElementById("sortSelect").value;
    let filteredStudents = students.filter(student => {
        const name = (student.name || "").toLowerCase();
        const email = (student.email || "").toLowerCase();
        const city = (student.address?.city || "Not provided").toLowerCase();
        const matchesSearch = name.includes(searchText) || email.includes(searchText);
        const matchesCity = selectedCity === "all" || city === selectedCity.toLowerCase();
        return matchesSearch && matchesCity;
    });

    filteredStudents.sort((a, b) => {
        if (sortValue === "name-asc") return (a.name || "").localeCompare(b.name || "");
        if (sortValue === "name-desc") return (b.name || "").localeCompare(a.name || "");
        if (sortValue === "city-asc") return (a.address?.city || "").localeCompare(b.address?.city || "");
        if (sortValue === "newest") return Number(b.id) - Number(a.id);
        return 0;
    });

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const startIndex = (currentPage - 1) * pageSize;
    const pageStudents = filteredStudents.slice(startIndex, startIndex + pageSize);
    studentGrid.innerHTML = "";

    pageStudents.forEach(student => {
        const card = document.createElement("article");
        card.className = "student-card";

        const initials = getInitials(student.name);
        const name = student.name || "Unnamed student";
        const email = student.email || "No email provided";
        const phone = student.phone || "No phone provided";
        const city = student.address?.city || "Not provided";

        const cardTop = document.createElement("div");
        cardTop.className = "card-top";

        const avatar = document.createElement("div");
        avatar.className = "student-avatar";
        avatar.textContent = initials;

        const heading = document.createElement("div");
        heading.className = "student-heading";

        const studentName = document.createElement("h3");
        studentName.textContent = name;

        const studentId = document.createElement("span");
        studentId.className = "student-id";
        studentId.textContent = `STU-${String(student.id).padStart(3, "0")}`;

        heading.append(studentName, studentId);

        const menu = document.createElement("span");
        menu.className = "card-menu";
        menu.textContent = "•••";

        cardTop.append(avatar, heading, menu);

        const emailLine = createContactLine("✉", email);
        const phoneLine = createContactLine("⌕", phone);
        const cityLine = createContactLine("⌖", city);
        cityLine.classList.add("city-line");

        const actions = document.createElement("div");
        actions.className = "card-actions";

        const editButton = createActionButton("Edit details", "card-button edit", () => openEditForm(student.id));
        const deleteButton = createActionButton("Delete", "card-button delete", () => deleteStudent(student.id));
        const emailButton = createActionButton("Update email · PATCH", "card-button email", () => openEmailForm(student.id));

        actions.append(editButton, deleteButton, emailButton);
        card.append(cardTop, emailLine, phoneLine, cityLine, actions);
        studentGrid.appendChild(card);
    });

    loadingMessage.classList.add("hidden");
    errorMessage.classList.add("hidden");

    if (filteredStudents.length === 0) {
        emptyMessage.classList.remove("hidden");
    } else {
        emptyMessage.classList.add("hidden");
    }

    const resultText = searchText
        ? `${filteredStudents.length} matching student${filteredStudents.length === 1 ? "" : "s"}`
        : `${filteredStudents.length} student${filteredStudents.length === 1 ? "" : "s"} shown`;

    document.getElementById("footerCount").textContent = resultText;
    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prevPage").disabled = currentPage <= 1;
    document.getElementById("nextPage").disabled = currentPage >= totalPages;
    updateStats(filteredStudents.length);
}

function createContactLine(symbol, value) {
    const line = document.createElement("div");
    line.className = "contact-line";

    const icon = document.createElement("span");
    icon.className = "contact-symbol";
    icon.textContent = symbol;

    const text = document.createElement("span");
    text.className = "contact-value";
    text.textContent = value;

    line.append(icon, text);
    return line;
}

function createActionButton(label, className, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
}

function getInitials(name) {
    return (name || "S")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}

function updateStats(visibleCount) {
    document.getElementById("totalCount").textContent = isLoading && students.length === 0 ? "—" : students.length;
    const contactCount = students.filter(student => student.email && student.phone).length;
    document.getElementById("contactCount").textContent = isLoading && students.length === 0 ? "—" : contactCount;
    document.getElementById("viewCount").textContent = visibleCount === undefined
        ? (isLoading && students.length === 0 ? "—" : students.length)
        : visibleCount;
}

function openAddForm() {
    studentForm.reset();
    document.getElementById("studentId").value = "";
    document.getElementById("modalEyebrow").textContent = "NEW RECORD";
    document.getElementById("modalTitle").textContent = "Add a student";
    document.getElementById("modalDescription").textContent = "Enter the student's information below.";
    saveButton.innerHTML = 'Save student <span>→</span>';
    studentModal.classList.remove("hidden");
    document.getElementById("studentName").focus();
}

function openEditForm(id) {
    const student = students.find(item => item.id === id);

    if (!student) {
        showToast("This student could not be found.", true);
        return;
    }

    document.getElementById("studentId").value = student.id;
    document.getElementById("studentName").value = student.name || "";
    document.getElementById("studentEmail").value = student.email || "";
    document.getElementById("studentPhone").value = student.phone || "";
    document.getElementById("studentCity").value = student.address?.city || "";
    document.getElementById("modalEyebrow").textContent = "EDIT RECORD · PUT";
    document.getElementById("modalTitle").textContent = "Edit student";
    document.getElementById("modalDescription").textContent = "Update the student's complete information.";
    saveButton.innerHTML = 'Save changes <span>→</span>';
    studentModal.classList.remove("hidden");
    document.getElementById("studentName").focus();
}

function closeStudentModal() {
    studentModal.classList.add("hidden");
    studentForm.reset();
}

async function saveStudent(event) {
    event.preventDefault();

    const id = document.getElementById("studentId").value;
    const payload = {
        name: document.getElementById("studentName").value.trim(),
        email: document.getElementById("studentEmail").value.trim(),
        phone: document.getElementById("studentPhone").value.trim(),
        address: {
            city: document.getElementById("studentCity").value.trim()
        }
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.address.city) {
        showToast("Please complete all fields.", true);
        return;
    }

    saveButton.disabled = true;
    saveButton.textContent = id ? "Saving changes..." : "Adding student...";

    try {
        let response;

        if (id) {
            response = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            throw new Error("Unable to save student");
        }

        const savedStudent = await response.json();

        if (id) {
            students = students.map(student => student.id === Number(id)
                ? { ...student, ...savedStudent, address: payload.address }
                : student);
            showToast("Student details updated successfully using PUT.");
        } else {
            students.unshift({
                ...payload,
                ...savedStudent,
                address: payload.address
            });
            showToast("New student added successfully using POST.");
        }

        saveLocalBackup();
        updateCityOptions();
        closeStudentModal();
        renderStudents();
    } catch (error) {
        console.error("Save error:", error);
        showToast("Unable to save student. Please try again.", true);
    } finally {
        saveButton.disabled = false;
        saveButton.innerHTML = document.getElementById("studentId").value
            ? 'Save changes <span>→</span>'
            : 'Save student <span>→</span>';
    }
}

function openEmailForm(id) {
    const student = students.find(item => item.id === id);

    if (!student) {
        showToast("This student could not be found.", true);
        return;
    }

    document.getElementById("emailStudentId").value = student.id;
    document.getElementById("newEmail").value = student.email || "";
    document.getElementById("emailStudentName").textContent = `Change the email address for ${student.name}.`;
    emailModal.classList.remove("hidden");
    document.getElementById("newEmail").focus();
}

function closeEmailForm() {
    emailModal.classList.add("hidden");
    emailForm.reset();
}

async function updateStudentEmail(event) {
    event.preventDefault();

    const id = document.getElementById("emailStudentId").value;
    const newEmail = document.getElementById("newEmail").value.trim();

    if (!newEmail) {
        showToast("Please enter an email address.", true);
        return;
    }

    emailSaveButton.disabled = true;
    emailSaveButton.textContent = "Updating...";

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: newEmail })
        });

        if (!response.ok) {
            throw new Error("Unable to update email");
        }

        const updatedStudent = await response.json();

        students = students.map(student => student.id === Number(id)
            ? { ...student, ...updatedStudent, email: newEmail }
            : student);

        saveLocalBackup();
        closeEmailForm();
        renderStudents();
        showToast("Email updated successfully using PATCH.");
    } catch (error) {
        console.error("PATCH error:", error);
        showToast("Unable to update email. Please try again.", true);
    } finally {
        emailSaveButton.disabled = false;
        emailSaveButton.innerHTML = 'Update email <span>→</span>';
    }
}

async function deleteStudent(id) {
    const student = students.find(item => item.id === id);

    if (!student) {
        showToast("This student could not be found.", true);
        return;
    }

    const confirmed = confirm(`Are you sure you want to delete ${student.name}?`);

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Unable to delete student");
        }

        students = students.filter(item => item.id !== id);
        saveLocalBackup();
        updateCityOptions();
        renderStudents();
        showToast(`${student.name} was removed from the directory.`);
    } catch (error) {
        console.error("DELETE error:", error);
        showToast("Unable to delete student. Please try again.", true);
    }
}

function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.className = isError ? "toast error" : "toast";

    const mark = document.createElement("span");
    mark.className = "toast-mark";
    mark.textContent = isError ? "!" : "✓";

    const text = document.createElement("span");
    text.textContent = message;

    toast.append(mark, text);
    document.getElementById("toastRegion").appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

function saveLocalBackup() {
    localStorage.setItem("studentHubData", JSON.stringify(students));
}

function updateCityOptions() {
    const cityFilter = document.getElementById("cityFilter");
    const currentCity = cityFilter.value;
    const cities = [...new Set(students.map(student => student.address?.city || "Not provided"))].sort();
    cityFilter.innerHTML = '<option value="all">All cities</option>';
    cities.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
    cityFilter.value = cities.includes(currentCity) ? currentCity : "all";
}

function exportStudents() {
    const file = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "studenthub-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    showToast("Student data exported as JSON.");
}

function importStudents(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const imported = JSON.parse(reader.result);
            if (!Array.isArray(imported) || imported.some(student => !student.name || !student.email)) {
                throw new Error("Invalid student file");
            }
            students = imported.map((student, index) => ({
                ...student,
                id: student.id ?? Date.now() + index,
                address: student.address || { city: "Not provided" }
            }));
            saveLocalBackup();
            updateCityOptions();
            currentPage = 1;
            renderStudents();
            showToast("Student data imported successfully.");
        } catch (error) {
            showToast("Invalid JSON file. Please choose a StudentHub backup.", true);
        }
        event.target.value = "";
    };
    reader.readAsText(file);
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("studentHubDarkMode", isDark ? "on" : "off");
    document.getElementById("themeToggle").textContent = isDark ? "☀" : "☾";
}

function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("collapsed");
    document.querySelector(".main-content").classList.toggle("sidebar-collapsed");
}

document.getElementById("showAddForm").addEventListener("click", openAddForm);
document.getElementById("closeModal").addEventListener("click", closeStudentModal);
document.getElementById("cancelModal").addEventListener("click", closeStudentModal);
document.getElementById("closeEmailModal").addEventListener("click", closeEmailForm);
document.getElementById("cancelEmailModal").addEventListener("click", closeEmailForm);
studentForm.addEventListener("submit", saveStudent);
emailForm.addEventListener("submit", updateStudentEmail);
searchInput.addEventListener("input", () => { currentPage = 1; renderStudents(); });
document.getElementById("cityFilter").addEventListener("change", () => { currentPage = 1; renderStudents(); });
document.getElementById("sortSelect").addEventListener("change", () => { currentPage = 1; renderStudents(); });
document.getElementById("prevPage").addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderStudents(); } });
document.getElementById("nextPage").addEventListener("click", () => { currentPage++; renderStudents(); });
document.getElementById("exportButton").addEventListener("click", exportStudents);
document.getElementById("importButton").addEventListener("click", () => document.getElementById("importFile").click());
document.getElementById("importFile").addEventListener("change", importStudents);
document.getElementById("themeToggle").addEventListener("click", toggleDarkMode);
document.getElementById("sidebarToggle").addEventListener("click", toggleSidebar);
if (localStorage.getItem("studentHubDarkMode") === "on") {
    document.body.classList.add("dark-mode");
    document.getElementById("themeToggle").textContent = "☀";
}
document.getElementById("refreshButton").addEventListener("click", getStudents);
document.getElementById("retryButton").addEventListener("click", getStudents);

studentModal.addEventListener("click", event => {
    if (event.target === studentModal) {
        closeStudentModal();
    }
});

emailModal.addEventListener("click", event => {
    if (event.target === emailModal) {
        closeEmailForm();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeStudentModal();
        closeEmailForm();
    }
});

getStudents();
