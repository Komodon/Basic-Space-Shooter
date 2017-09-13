    var game = new Phaser.Game(800, 600, Phaser.AUTO, null, { preload: preload, create: create, update: update });

    //creazione variabili
    var BULLET_SPEED = 400;
    var MAXSPEED = 400;

    var player;
    var firstEnemy;
    var sfondo;
    var shipTrail;
    var bullets;
    var fireButton;
    var bank;
    var bulletTimer = 0;
    var explosions;
    var enemyLaunchTimer;
    var gameOver;
    var score = 0;
    var scoreText;
    var win = false;
    var min_enemy_spacing = 300;
    var max_enemy_spacing;
    var enemy_speed;

    //funzione Phaser caricamento pre-partita
    function preload() {
        //caricamento immagini
        game.load.image('sfondo', 'assets/sfondo.png');
        game.load.image('bullet', '/assets/img/bullet.png');
        game.load.image('player', '/assets/img/player.png');
        game.load.image('firstEnemy', '/assets/img/enemy_1.png');
        game.load.spritesheet('explosion', '/assets/img/explode.png', 128, 128);
    }

    //funzione Phaser creazione personaggi
    function create() {
        //aggiunta sfondo
        sfondo = game.add.tileSprite(0, 0, 800, 600, 'sfondo');

        //aggiungi il player
        player = game.add.sprite(400, 500, 'player');
        player.anchor.setTo(0.5, 0.5);
        player.health = 20;

        //abilita la fisica arcade
        game.physics.enable(player, Phaser.Physics.ARCADE);

        //elimina la coda del player quando muore
        player.events.onKilled.add(function() {
            shipTrail.kill();
        });

        //abilita la coda del player quando è vivo
        player.events.onRevived.add(function() {
            shipTrail.start(false, 5000, 10);
        });

        //aggiungi i colpi del player
        bullets = game.add.group();
        bullets.enableBody = true;
        bullets.physicsBodyType = Phaser.Physics.ARCADE;
        bullets.createMultiple(30, 'bullet');
        bullets.setAll('anchor.x', 0.5);
        bullets.setAll('anchor.y', 1);
        bullets.setAll('outOfBoundsKill', true);
        bullets.setAll('checkWorldBounds', true);
        fireButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

        //aggiungi la coda del player
        shipTrail = game.add.emitter(player.x, player.y + 20, 400);
        shipTrail.width = 10;
        shipTrail.makeParticles('bullet');
        shipTrail.setXSpeed(30, -30);
        shipTrail.setYSpeed(200, 180);
        shipTrail.setRotation(50, -50);
        shipTrail.setAlpha(1, 0.01, 800);
        shipTrail.setScale(0.05, 0.4, 0.05, 0.4, 2000, Phaser.Easing.Quintic.Out);
        shipTrail.start(false, 5000, 10);

        //aggiungi le esplosioni
        explosions = game.add.group();
        explosions.enableBody = true;
        explosions.physicsBodyType = Phaser.Physics.ARCADE;
        explosions.createMultiple(30, 'explosion');
        explosions.setAll('anchor.x', 0.5);
        explosions.setAll('anchor.y', 0.5);
        explosions.forEach(function(explosion) {
            explosion.animations.add('explosion');
        });

        //aggiungi il nemico
        firstEnemy = game.add.group();
        firstEnemy.enableBody = true;
        firstEnemy.physicsBodyType = Phaser.Physics.ARCADE;
        firstEnemy.createMultiple(7, 'firstEnemy');
        firstEnemy.setAll('anchor.x', 0.5);
        firstEnemy.setAll('anchor.y', 0.5);
        firstEnemy.setAll('scale.x', 0.5);
        firstEnemy.setAll('scale.y', 0.5);
        firstEnemy.setAll('angle', 180);
        //gestione grandezza, danno e coda nemico
        firstEnemy.forEach(function(enemy) {
            enemy.body.setSize(enemy.width * 3 / 4, enemy.height * 3 / 4);
            addEnemyEmitterTrail(enemy);
            enemy.damageAmount = 20;
            enemy.events.onKilled.add(function() {
                enemy.trail.kill();
            });
        });
        //richiama nemico
        Enemy();

        //aggiungi la visualizzazione dello score
        scoreText = game.add.text(10, 10, '', { font: '20px Arial', fill: '#fff' });
        scoreText.render = function() {
            scoreText.text = 'Score: ' + score;
        };
        scoreText.render();

        //aggiungi la visualizzazione del game over
        gameOver = game.add.text(game.world.centerX, game.world.centerY, 'GAME OVER!', { font: '84px Arial', fill: '#fff' });
        gameOver.anchor.setTo(0.5, 0.5);
        gameOver.visible = false;

        //aggiungi la visualizzazione della vittoria
        gameOver_victory = game.add.text(game.world.centerX, game.world.centerY, 'YOU WIN!', { font: '84px Arial', fill: '#fff' });
        gameOver_victory.anchor.setTo(0.5, 0.5);
        gameOver_victory.visible = false;
    }

    //Funzione Phaser di aggiornamento
    function update() {
        //determina la posizione dello sfondo
        sfondo.tilePosition.y += 2;

        //aggiungi la sovrapposizione
        game.physics.arcade.overlap(player, firstEnemy, shipCollide, null, this);
        game.physics.arcade.overlap(firstEnemy, bullets, hitEnemy, null, this);

        //determina la posizione della coda del player
        shipTrail.x = player.x;

        //richiamo funzione di sparo
        if (player.alive && (fireButton.isDown || game.input.activePointer.isDown)) { fireBullet(); }

        //aggiungi limiti player + decelerazione
        if (game.input.x < game.width - 20 && game.input.x > 20 && game.input.y > 20 && game.input.y < game.height - 20) {
            var minDist = 200;
            var dist = game.input.x - player.x;
            player.body.velocity.x = MAXSPEED * game.math.clamp(dist / minDist, -1, 1);
        }

        //posizione minima e massima del player
        if (player.x > game.width - 50) {
            player.x = game.width - 50;
            player.body.acceleration.x = 0;
        }
        if (player.x < 50) {
            player.x = 50;
            player.body.acceleration.x = 0;
        }

        //imposta il bank
        bank = player.body.velocity.x / MAXSPEED;
        player.scale.x = 1 - Math.abs(bank) / 2;
        player.angle = bank * 10;

        //imposta il danno del player
        player.damage(Enemy.damageAmount);

        //controlla se il giocatore è morto
        if (!player.alive && gameOver.visible === false && win === false) {
            scoreText.visible = false;
            gameOver.visible = true;
            gameOver.alpha = 0;
            score = 0;

            //visualizza il ""game over""
            var fadeInGameOver = game.add.tween(gameOver);
            fadeInGameOver.to({ alpha: 1 }, 1000, Phaser.Easing.Quintic.Out);
            fadeInGameOver.onComplete.add(setResetHandlers);
            fadeInGameOver.start();

            //funzione richiamo restart
            function setResetHandlers() {
                tapRestart = game.input.onTap.addOnce(_restart, this);
                spaceRestart = fireButton.onDown.addOnce(_restart, this);

                function _restart() {
                    tapRestart.detach();
                    spaceRestart.detach();
                    location.reload();
                }
            }
        } else {
            if (player.alive && gameOver.visible === false && win === false)
                victory();
        }
    }

    //funzione sparo proiettili
    function fireBullet() {
        //imposta un limite ai colpi
        if (game.time.now > bulletTimer) {
            var BULLET_SPEED = 400; //crea variabile di sistema per la velocità dei proiettili
            var BULLET_SPACING = 250; //crea variabile di sistema per la distanza dei proiettili

            var bullet = bullets.getFirstExists(false);

            //gestisce le proprietà dei vari 'bullet' in gioco
            if (bullet) {
                var bulletOffset = 20 * Math.sin(game.math.degToRad(player.angle));
                bullet.reset(player.x + bulletOffset, player.y);
                bullet.angle = player.angle;
                game.physics.arcade.velocityFromAngle(bullet.angle - 90, BULLET_SPEED, bullet.body.velocity);
                bullet.body.velocity.x += player.body.velocity.x;

                bulletTimer = game.time.now + BULLET_SPACING;
            }
        }
    }

    //funzione per creare i nemici
    function Enemy() {
         //definisce la distanza minima tra un nemico e il sucessivo

        //definisce la distanza massima tra un nemico e il sucessivo. Incrementa il numero di nemici raggiunto un certo punteggio
        if (score < 200) {
            enemy_speed = 200;
            max_enemy_spacing = 2000;
        } else {
            enemy_speed = score + 100; //definisce la velocità dei nemici in base al punteggio
            if (score < 700) max_enemy_spacing = 2000 - score;
            else max_enemy_spacing = 500;
        }

        //definisce varie proprietà dei nemici
        for (var i = 0; i < 3; i++) {
            var enemy = firstEnemy.getFirstExists(false);
            if (enemy) {
                enemy.reset(game.rnd.integerInRange(0, game.width), -20 * i); //assegna la posizione al nemico
                enemy.body.velocity.x = game.rnd.integerInRange(-300, 300); //assegna la velocità sull'asse X
                enemy.body.velocity.y = enemy_speed; //assegna la velocità sull'asse Y
                enemy.body.drag.x = 100; //definisce l'angolo di entrata del nemico

                enemy.trail.start(false, 800, 1); //inizializza la 'trail' del nemico

                //update del nemico
                enemy.update = function() {
                    this.trail.x = this.x;
                    this.trail.y = this.y - 23;

                    //distrugge il nemico quando supera il bordo inferiore del gioco
                    if (this.y > game.height + 200) {
                        this.kill();
                    }
                }
            }
        }

        game.time.events.add(game.rnd.integerInRange(min_enemy_spacing, max_enemy_spacing), Enemy); //crea un nuovo nemico dopo un certo delay
    }

    //funzione per quando il 'player' si scontra con un nemico
    function shipCollide(player, enemy) {

        //definisce le esplosioni sucessive allo scontro
        var explosion = explosions.getFirstExists(false);
        explosion.reset(enemy.body.x + enemy.body.halfWidth, enemy.body.y + enemy.body.halfHeight);

        explosion.body.velocity.y = enemy.body.velocity.y;
        explosion.alpha = 0.7;
        explosion.play('explosion', 30, false, true);

        //uccide sia il 'player' che il nemico
        enemy.kill();
        player.kill();
    }

    //funzione per quando un 'bullet' si scontra con un nemico
    function hitEnemy(enemy, bullet) {

        //definisce le esplosioni sucessive allo scontro
        var explosion = explosions.getFirstExists(false);
        explosion.reset(bullet.body.x + bullet.body.halfWidth, bullet.body.y + bullet.body.halfHeight);

        explosion.body.velocity.y = enemy.body.velocity.y;
        explosion.alpha = 0.7;
        explosion.play('explosion', 30, false, true);

        //uccide sia il 'player' che il nemico
        enemy.kill();
        bullet.kill();

        //aumenta lo 'score' e aggiorna il testo che mostra il punteggio totale
        score += 50;
        scoreText.render();
    }

    //aggiunge una 'trail' ad ogni nemico
    function addEnemyEmitterTrail(enemy) {
        //imposta le proprietà della 'trail'
        var enemyTrail = game.add.emitter(enemy.x, player.y - 10, 100);
        enemyTrail.width = 15;
        enemyTrail.makeParticles('explosion', [1, 2, 3, 4, 5]);
        enemyTrail.setXSpeed(20, -20);
        enemyTrail.setRotation(50, -50);
        enemyTrail.setAlpha(0.4, 0, 800);
        enemyTrail.setScale(0.02, 0.2, 0.02, 0.2, 1000, Phaser.Easing.Quintic.Out);
        enemy.trail = enemyTrail;
    }

    //funzione per riavviare il gioco
    function restart() {
        //uccide i nemici prima di iniziare la nuova partita
        firstEnemy.callAll('kill');
        game.time.events.remove(enemyLaunchTimer);
        game.time.events.add(1000, Enemy);

        //resuscita il 'player'
        player.revive();
        player.health = 20;

        //il testo del punteggio totale torna visibile e viene aggiornato lo 'score'
        scoreText.visible = true;
        score = 0;
        scoreText.render();

        //nasconde entrambi i testi di fine gioco
        gameOver.visible = false;
        gameOver_victory.visible = false;

        win = false;
    }

    //funzione per la vittoria
    function victory() {
        //controlla se lo score è maggiore o uguale a 1000
        if (score >= 1000) {
            scoreText.visible = false; //nasconde il testo che mostra il punteggio totale
            gameOver_victory.visible = true;
            gameOver_victory.alpha = 0;

            win = true;
            score = 0;

            player.kill();

            //mostra il testo di vittoria
            var fadeInVictory = game.add.tween(gameOver_victory);
            fadeInVictory.to({ alpha: 1 }, 1000, Phaser.Easing.Quintic.Out);
            fadeInVictory.onComplete.add(setResetHandlers);
            fadeInVictory.start();

            //funzione richiamo restart
            function setResetHandlers() {
                tapRestart = game.input.onTap.addOnce(_restart, this);
                spaceRestart = fireButton.onDown.addOnce(_restart, this);

                function _restart() {
                    tapRestart.detach();
                    spaceRestart.detach();
                    location.reload();
                }
            }
        }
    }

    //funzione per il 'render' dei nemici
    function render() {
        enemyLaunchTimer = game.time.events.add(game.rnd.integerInRange(min_enemy_spacing, max_enemy_spacing), enemyLaunchTimer);
    }