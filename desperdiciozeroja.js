// ========================================
// MENU AUTOMÁTICO AO ROLAR A PÁGINA
// ========================================

const sections = document.querySelectorAll(
    "#inicio, #dicas, #produtos, #sobre"
);

const menuLinks = document.querySelectorAll(
    ".menu a[data-section]"
);


// ========================================
// FUNÇÃO PARA SELECIONAR O MENU
// ========================================

function setActiveSection(sectionId) {

    menuLinks.forEach(function (link) {

        link.classList.remove("active");

        if (link.dataset.section === sectionId) {
            link.classList.add("active");
        }

    });

}


// ========================================
// OBSERVA AS SEÇÕES DA PÁGINA
// ========================================

const observer = new IntersectionObserver(

    function (entries) {

        entries.forEach(function (entry) {

            if (entry.isIntersecting) {

                setActiveSection(entry.target.id);

            }

        });

    },

    {
        root: null,

        threshold: 0.35,

        rootMargin: "-90px 0px -35% 0px"
    }

);


sections.forEach(function (section) {

    observer.observe(section);

});


// ========================================
// MENU MOBILE
// ========================================

const menuButton =
    document.querySelector(".menu-btn");

const menu =
    document.querySelector(".menu");


menuButton.addEventListener(
    "click",
    function () {

        if (menu.style.display === "flex") {

            menu.style.display = "none";

        } else {

            menu.style.display = "flex";

            menu.style.flexDirection = "column";

            menu.style.position = "absolute";

            menu.style.top = "75px";

            menu.style.left = "0";

            menu.style.right = "0";

            menu.style.background = "white";

            menu.style.padding = "20px";

            menu.style.boxShadow =
                "0 10px 20px #075c4920";
        }

    }
);


// ========================================
// FECHAR MENU MOBILE AO CLICAR
// ========================================

const allMenuLinks =
    document.querySelectorAll(".menu a");


allMenuLinks.forEach(function (link) {

    link.addEventListener(
        "click",
        function () {

            if (window.innerWidth <= 900) {

                menu.style.display = "none";

            }

        }
    );

});