class Animator {
    static flip(card, delay=0, callback) { // Animates the card itself
        card.animating = true;

        const DURATION = 120;

        const moveUpTween = new TWEEN.Tween(card.faceContainer);
        const disappearTween = new TWEEN.Tween(card);
        const appearTween = new TWEEN.Tween(card);
        const moveDownTween = new TWEEN.Tween(card.faceContainer);

        // FIXME: Why doesn't it work with the face container?

        // Move the card up
        moveUpTween
            .to({y: -20}, DURATION)
            .easing(TWEEN.Easing.Quartic.InOut)
            .delay(delay);
        // Flip first face
        disappearTween
            .to({width: 0}, DURATION)
            .easing(TWEEN.Easing.Exponential.In)
            .delay(delay);
        // Flip second face
        appearTween
            .to({width: card.width}, DURATION) // width: card.width, because we have to recollect the old width (because scale is altered by the responsiveness)
            .easing(TWEEN.Easing.Exponential.Out);
        // Move the card down
        moveDownTween
            .to({y: 0}, DURATION)
            .easing(TWEEN.Easing.Quartic.InOut);

        moveUpTween.chain(moveDownTween);
        disappearTween.chain(appearTween);

        moveUpTween.start();
        disappearTween.start();

        disappearTween.onComplete(() => {
            card.showFront(!card.showingFront); // Change face
        });

        appearTween.onComplete(() => {
            if (callback) callback();
            card.animating = false; // Tell the card that the animation is finished
        });
    }

    static funkyRotate(card, delay) {
        const defaultRotation = card.rotation;

        const firstRightRotateTween = new TWEEN.Tween(card);
        firstRightRotateTween
            .to({rotation: Math.PI / 40}, 100)
            .delay(delay);

        const leftRotateTween = new TWEEN.Tween(card);
        leftRotateTween
            .to({rotation: -Math.PI / 20}, 100)
            .repeat();
        const rightRotateTween = new TWEEN.Tween(card);
        rightRotateTween
            .to({rotation: Math.PI / 20}, 100);
        const resetRotateTween = new TWEEN.Tween(card);
        resetRotateTween
            .to({rotation: defaultRotation}, 100);

        firstRightRotateTween.chain(leftRotateTween);
        leftRotateTween.chain(rightRotateTween);
        rightRotateTween.chain(resetRotateTween);

        firstRightRotateTween.start();
    }
}

class Card extends PIXI.Container {
    showingFront;
    faceContainer;
    front;
    back;

    backFilter;
    animating = false;

    RANDOM_ROTATION_ANGLE = Math.PI / 24;

    constructor(name, front, back) {
        super();
        this.name = name;

        this.front = front;
        this.front.anchor.set(0.5)
        this.addChild(front);

        this.back = back;
        this.back.anchor.set(0.5);
        this.addChild(back);

        this.faceContainer = new PIXI.Container();
        this.faceContainer.addChild(front);
        this.faceContainer.addChild(back);

        this.rotation = Math.random() * this.RANDOM_ROTATION_ANGLE - this.RANDOM_ROTATION_ANGLE / 2; // Funky rotation

        this.addChild(this.faceContainer);

        this.showFront(false); // Hidden by default

        this.backFilter = new PIXI.filters.ColorMatrixFilter();
        this.back.filters = [this.backFilter];

        // Interactivity

        this.interactive = true;
        this.buttonMode = "pointer";

        this.on("pointertap", () => { // Flip the card
            if (!this.animating && selectedCards.length < 2 && !this.showingFront) { // If it isn't already animating
                chooseCard(this);
            }
        });
        this.on("pointerover", () => { // Fired when the mouse enters card boundaries
            this.backFilter.brightness(1.15);
        });
        this.on("pointerout", () => { // Fired when the mouse leaves card boundaries
            this.backFilter.brightness(1);
        });
    }

    hasSameMotif(otherCard) {
        return this.name === otherCard.name;
    }

    showFront(boolean) {
        this.showingFront = boolean;
        this.front.renderable = boolean; // We're not using "visible", otherwise it wouldn't calculate transformations
        this.back.renderable = !boolean;
    }

    getCurrentFace() {
        return this.showingFront ? this.front : this.back;
    }

    getHiddenFace() {
        return this.showingFront ? this.back : this.front;
    }
}

function chooseCard(card) {
    if (selectedCards.length < 2) {
        Animator.flip(card); // Animation
        selectedCards.push(card);

        // If we have two cards ...
        if (selectedCards.length === 2) {
            attempts++;
            attemptsText.innerText = attempts.toString();

            if (selectedCards[0].hasSameMotif(selectedCards[1])) { // If it's the right pair...
                selectedCards.forEach(card => {
                    Animator.funkyRotate(card, PAIR_ROTATION_DELAY); // Delay to wait the flip animation (we can improve later)
                });

                pairsFound++;
                foundPairsText.innerText = pairsFound.toString();
                selectedCards = [];

                if (pairsFound === cards.length / 2) { // If all pairs have been found...
                    win();
                }
            } else { // If not...
                selectedCards.forEach(card => {
                    Animator.flip(card, PAIR_FLIP_DELAY, () => { // Animation
                        selectedCards = [];
                    });
                });
            }
        }
    }
}

function win() {
    winBanner.style.display = "block";
    playAgainBtn.style.display = "inline-block";
}

function createCards() {
    const unshuffledCards = [];
    const backTexture = PIXI.Texture.from("img/card_back.png");

    // Create the cards with the front and back sprites
    motifImages.forEach(motif => {
        for (let i = 0; i < 2; i++) { // Two cards
            const frontSprite = PIXI.Sprite.from("img/motifs/" + motif);
            const backSprite = PIXI.Sprite.from(backTexture);
            const card = new Card(motif, frontSprite, backSprite);

            unshuffledCards.push(card);
        }
    });

    // Shuffle the cards
    const cardsLength = unshuffledCards.length;
    for (let i = 0; i < cardsLength; i++) {
        const randomCard = unshuffledCards.splice(Math.round(Math.random() * (unshuffledCards.length - 1)), 1)[0];
        cards.push(randomCard);
    }
}

function deleteCards() {
    if (cards) {
        cards.forEach(card => {
            card.destroy({children: true});
        });
    }
    cards = [];
}

function displayCards() {
    // TODO: Improve later

    for (let i = 0; i < ROW_AMOUNT; i++) { // ROWS
        for (let j = 0; j < COLUMN_AMOUNT; j++) { // EACH CARD
            const card = cards[i * COLUMN_AMOUNT + j];
            const cardHeight = ((ROW_AMOUNT - 1) * GUTTER + 2 * V_PADDING - app.screen.height) / -ROW_AMOUNT;
            const cardWidth = cardHeight * CARD_RATIO; // Card width
            const H_PADDING = (COLUMN_AMOUNT * cardWidth + (COLUMN_AMOUNT - 1) * GUTTER - app.screen.width) / -2; // Calculate the horizontal padding
            const cardX = H_PADDING + j * cardWidth + j * GUTTER + (cardWidth / 2); // + (cardWidth / 2) compensates front/back middle anchor
            const cardY = V_PADDING + i * cardHeight + i * GUTTER + (cardHeight / 2); // + (cardHeight / 2) compensates front/back middle anchor

            // Set the card position/dimensions
            card.x = cardX;
            card.y = cardY;
            card.width = cardWidth;
            card.height = cardHeight;

            app.stage.addChild(card);
        }
    }

    // Display the total amount of pairs
    pairAmountText.innerText = (cards.length / 2).toString();
}

// Resize the renderer (responsive) on window resize
window.addEventListener("resize", () => {
    _w = window.innerWidth * 0.7;
    _h = window.innerHeight;
    app.renderer.resize(_w, _h);
})

const motifImages = [
    "camembert.png",
    "circle.png",
    "crescent.png",
    "heart.png",
    "square.png",
    "star.png"
];
const CARD_RATIO = 2.5 / 3.5; // Classical playing card ratio
const COLUMN_AMOUNT = 4;
const ROW_AMOUNT = Math.ceil(motifImages.length * 2 / COLUMN_AMOUNT);
const GUTTER = 20; // In pixels

// Get the canvas element
const canvas = document.getElementById("canvas");

// Get info elements
const foundPairsText = document.getElementById("found-pairs");
const pairAmountText = document.getElementById("pair-amount");
const attemptsText = document.getElementById("attempts");
const winBanner = document.getElementById("win-banner");
const playAgainBtn = document.getElementById("play-again");

let _w = window.innerWidth * 0.7;
let _h = window.innerHeight;

let V_PADDING; // Window vertical padding (will be updated through ticker because it's dynamic)
let PAIR_FLIP_DELAY;
let PAIR_ROTATION_DELAY;

let cards;
let selectedCards; // Cards chosen by the player
let pairsFound;
let attempts;

const app = new PIXI.Application({
    antialias: true,
    view: canvas,
    width: _w,
    height: _h,
    backgroundAlpha: 0,
    autoDensity: true
})

// Play again
playAgainBtn.addEventListener("click", () => {
    initGame();
})

function initGame() {
    V_PADDING = app.renderer.height * 0.15; // Window vertical padding (will be updated through ticker because it's dynamic)
    PAIR_FLIP_DELAY = 700;
    PAIR_ROTATION_DELAY = 340;

    deleteCards(); // Delete cards

    selectedCards = []; // Cards chosen by the player
    pairsFound = 0;
    attempts = 0;

    // Create cards
    createCards();

    foundPairsText.innerText = pairsFound.toString();
    pairAmountText.innerText = (cards.length / 2).toString();
    attemptsText.innerText = attempts.toString();

    // Hide win banner and reset button
    winBanner.style.display = "none";
    playAgainBtn.style.display = "none";

    // Animate
    app.ticker.add(delta => {
        V_PADDING = app.renderer.height * 0.15;
        displayCards();

        TWEEN.update(); // NEVER FORGET AGAIN
    });
}

initGame(); // Initialize the game