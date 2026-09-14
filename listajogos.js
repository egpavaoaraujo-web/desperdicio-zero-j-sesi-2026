// ========================================
// MENU MOBILE
// ========================================

const menuButton =
    document.getElementById("menuBtn");

const menu =
    document.querySelector(".menu");


menuButton.addEventListener("click", function () {

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
            "0 10px 25px #075c4920";

        menu.style.zIndex = "99";
    }

});



// ========================================
// FECHAR MENU AO CLICAR
// ========================================

const links =
    document.querySelectorAll(".menu a");


links.forEach(function (link) {

    link.addEventListener("click", function () {

        if (window.innerWidth <= 800) {

            menu.style.display = "none";

        }

    });

});



// ========================================
// EFEITO NOS CARDS
// ========================================

const cards =
    document.querySelectorAll(".game-card");


cards.forEach(function (card) {

    card.addEventListener("mouseenter", function () {

        card.style.zIndex = "2";

    });


    card.addEventListener("mouseleave", function () {

        card.style.zIndex = "1";

    });

});



// ========================================
// AVISO DO WORDWALL
// ========================================

const wordwallButton =
    document.querySelector(
        '.card-orange .play-button'
    );


wordwallButton.addEventListener(
    "click",
    function (event) {

        if (wordwallButton.getAttribute("href") === "#") {

            event.preventDefault();

            alert(
                "🚧 O link do Wordwall ainda não foi colocado!\n\n" +
                "Edite o arquivo jogos.html e coloque o link do seu Quiz."
            );

        }

    }
);