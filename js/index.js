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
    game;
    showingFront;
    faceContainer;
    front;
    back;

    backFilter;
    animating = false;

    RANDOM_ROTATION_ANGLE = Math.PI / 24;

    constructor(game, name, front, back) {
        super();
        this.game = game;
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
            if (!this.animating && this.game.selectedCards.length < 2 && !this.showingFront) { // If it isn't already animating
                this.game.chooseCard(this);
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

class Game extends PIXI.Application {
    frontTextureNames = [
        "img/motifs/camembert.png",
        "img/motifs/circle.png",
        "img/motifs/crescent.png",
        "img/motifs/heart.png",
        "img/motifs/square.png",
        "img/motifs/star.png"
    ];
    backTextureName = "img/card_back.png";
    soundNames = [
        "sounds/card_slide1.mp3",
        "sounds/card_flip1.mp3"
    ];
    loader;

    CARD_RATIO = 2.5 / 3.5; // Classical playing card ratio
    COLUMN_AMOUNT = 4;
    ROW_AMOUNT = Math.ceil(this.frontTextureNames.length * 2 / this.COLUMN_AMOUNT);
    GUTTER = 20; // In pixels

    _w;
    _h;

    PAIR_FLIP_DELAY = 700;
    PAIR_ROTATION_DELAY = 340;

    cards = [];
    selectedCards = [];

    pairsFound = 0;
    attempts = 0;

    // HTML elements
    canvas;
    foundPairsText = document.getElementById("found-pairs");
    pairAmountText = document.getElementById("pair-amount");
    attemptsText = document.getElementById("attempts");
    winBanner = document.getElementById("win-banner");
    playAgainBtn = document.getElementById("play-again");

    constructor() {
        const canvas = document.getElementById("canvas");
        const _w = window.innerWidth * 0.7;
        const _h = window.innerHeight;
        // Create a PixiJS application

        super({
            antialias: true,
            view: canvas,
            width: _w,
            height: _h,
            backgroundAlpha: 0,
            autoDensity: true
        });

        this.canvas = canvas;
        this.loader = PIXI.Loader.shared;
        this._w = _w;
        this._h = _h;

        // Resize
        window.addEventListener("resize", () => {
            console.log(this);
            this._w = window.innerWidth * 0.7;
            this._h = window.innerHeight;
            this.renderer.resize(_w, _h);
        });

        // Play again button
        this.playAgainBtn.addEventListener("click", () => {
            this.init();
        })

        this._loadResources(this.init.bind(this));
    }

    init() {
        this.deleteCards();
        this.createCards();

        this.selectedCards = [];
        this.pairsFound = 0;
        this.attempts = 0;

        // Hide win banner and reset button
        this.winBanner.style.display = "none";
        this.playAgainBtn.style.display = "none";

        // Initialize display of game info
        this.foundPairsText.innerText = this.pairsFound.toString();
        this.pairAmountText.innerText = (this.cards.length / 2).toString();
        this.attemptsText.innerText = this.attempts.toString();

        // Display the total amount of pairs
        this.pairAmountText.innerText = (this.cards.length / 2).toString();

        this.ticker.remove(this._animate.bind(this));
        this.ticker.add(this._animate.bind(this));
    }

    _loadResources(callback) {
        // Load resources (with the shared loader)
        [...this.frontTextureNames, this.backTextureName].forEach(textureName => {
            this.loader.add(textureName);
        });
        this.loader.load(callback);
    }

    _getVerticalPadding() {
        return this.renderer.height * 0.15;
    }

    _animate(delta) {
        this.displayCards();
        TWEEN.update();
    }

    createCards() {
        const unshuffledCards = [];
        const backTexture = this.loader.resources[this.backTextureName].texture;

        // Create the cards with the front and back sprites
        this.frontTextureNames.forEach(motif => {
            for (let i = 0; i < 2; i++) { // Two cards
                const frontSprite = PIXI.Sprite.from(this.loader.resources[motif].texture);
                const backSprite = PIXI.Sprite.from(backTexture);
                const card = new Card(this, motif, frontSprite, backSprite);

                unshuffledCards.push(card);
            }
        });

        // Shuffle the cards
        const cardsLength = unshuffledCards.length;
        for (let i = 0; i < cardsLength; i++) {
            const randomCard = unshuffledCards.splice(Math.round(Math.random() * (unshuffledCards.length - 1)), 1)[0];
            this.cards.push(randomCard);
        }
    }

    deleteCards() {
        if (this.cards) {
            this.cards.forEach(card => {
                card.destroy({children: true});
            });
        }
        this.cards = [];
    }

    displayCards() {
        // TODO: Improve later

        for (let i = 0; i < this.ROW_AMOUNT; i++) { // ROWS
            for (let j = 0; j < this.COLUMN_AMOUNT; j++) { // EACH CARD
                const card = this.cards[i * this.COLUMN_AMOUNT + j];
                const cardHeight = ((this.ROW_AMOUNT - 1) * this.GUTTER + 2 * this._getVerticalPadding() - this.screen.height) / -this.ROW_AMOUNT;
                const cardWidth = cardHeight * this.CARD_RATIO; // Card width
                const H_PADDING = (this.COLUMN_AMOUNT * cardWidth + (this.COLUMN_AMOUNT - 1) * this.GUTTER - this.screen.width) / -2; // Calculate the horizontal padding
                const cardX = H_PADDING + j * cardWidth + j * this.GUTTER + (cardWidth / 2); // + (cardWidth / 2) compensates front/back middle anchor
                const cardY = this._getVerticalPadding() + i * cardHeight + i * this.GUTTER + (cardHeight / 2); // + (cardHeight / 2) compensates front/back middle anchor

                // Set the card position/dimensions
                card.x = cardX;
                card.y = cardY;
                card.width = cardWidth;
                card.height = cardHeight;

                this.stage.addChild(card);
            }
        }
    } // Called every frame

    chooseCard(card) {
        if (this.selectedCards.length < 2) {
            // Play sound
            const slideSound = new Audio(this.soundNames[0]);
            slideSound.volume = 0.2;
            slideSound.play();

            Animator.flip(card); // Animation
            this.selectedCards.push(card);

            // If we have two cards ...
            if (this.selectedCards.length === 2) {
                this.attempts++;
                this.attemptsText.innerText = this.attempts.toString();

                if (this.selectedCards[0].hasSameMotif(this.selectedCards[1])) { // If it's the right pair...
                    this.selectedCards.forEach(card => {
                        Animator.funkyRotate(card, this.PAIR_ROTATION_DELAY); // Delay to wait the flip animation (we can improve later)
                    });

                    this.pairsFound++;
                    this.foundPairsText.innerText = this.pairsFound.toString();
                    this.selectedCards = [];

                    if (this.pairsFound === this.cards.length / 2) { // If all pairs have been found...
                        this.win();
                    }
                } else { // If not...
                    setTimeout(() => {
                        // Play sound
                        const flipSound = new Audio(this.soundNames[1]);
                        flipSound.play();
                    }, this.PAIR_FLIP_DELAY + 100);

                    this.selectedCards.forEach(card => {
                        Animator.flip(card, this.PAIR_FLIP_DELAY, () => { // Animation
                            this.selectedCards = [];
                        });
                    });
                }
            }
        }
    }

    win() {
        this.winBanner.style.display = "block";
        this.playAgainBtn.style.display = "inline-block";
    }
}

// Main program

const game = new Game();