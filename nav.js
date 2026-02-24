/* ================= NAVIGATION ================= */

function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const sections = document.querySelectorAll(".section");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(nav => nav.classList.remove("active"));
            sections.forEach(section => section.classList.remove("active-section"));

            item.classList.add("active");

            const sectionId = item.dataset.section;
            const selectedSection = document.getElementById(sectionId);
            if (selectedSection) selectedSection.classList.add("active-section");

            // Re-render dashboard when opened
            if (sectionId === "dashboardSection") {
                renderDashboard();
            }
        });
    });
}
