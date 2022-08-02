import { Player } from "./Player.js";

class Game {
  constructor() {
    this.time;
    this.socket1;
    this.socket2;
    this.player1;
    this.player2;
    this.isGood = true;

    // clock
    setInterval(() => {
      if (this.socket1 && this.socket2) {
        if (this.time >= 0) {
            this.socket1.emit('time', this.time);
            this.socket2.emit('time', this.time);
            this.time -= 1
        } else {
            if (this.player1.getHealth() > this.player2.getHealth()) {
              this.socket1.emit('game-over', 1);
              this.socket2.emit('game-over', 1);
            } else if (this.player1.getHealth() < this.player2.getHealth()) {
              this.socket1.emit('game-over', 2);
              this.socket2.emit('game-over', 2);
            } else {
              this.socket1.emit('game-over', 0);
              this.socket2.emit('game-over', 0);
            }
        }
      } else {
        this.time = 3;
      }
    }, 1000);
    
  }

  setupSockets = () => {
    if (this.socket1 && this.socket2) {
      this.socket1.on("action", (data) => {
        this.player1.setKeys(data["keys"]);
        this.player1.setDelta(data["delta"]);
      });
      this.socket2.on("action", (data) => {
        this.player2.setKeys(data["keys"]);
        this.player2.setDelta(data["delta"]);
      });
    } else {
      console.log("could not setup sockets");
    }
  }

  // updates the position and movement flags
  updateMovement = () => {
    // check collisions and stuff
    this.checkLeft();
    this.checkPlayerCollision();
    this.checkAttackCollision();
    this.player1.updateMovement();
    this.player2.updateMovement();
    this.socket1.emit("new-info", {
      player1Info: this.player1.getInfo(),
      player2Info: this.player2.getInfo(),
      attackCollisionPos1: this.player1.getAttackCollision(),
      attackCollisionPos2: this.player2.getAttackCollision(),
      cooldowns: this.player1.getCooldowns(),
    });

    this.socket2.emit("new-info", {
      player1Info: this.player1.getInfo(),
      player2Info: this.player2.getInfo(),
      attackCollisionPos1: this.player1.getAttackCollision(),
      attackCollisionPos2: this.player2.getAttackCollision(),
      cooldowns: this.player2.getCooldowns(),
    });
  };

  updatePosition = () => {
    this.player1.updatePosition();
    this.player2.updatePosition();
  };

  disconnected = () => {
    if (this.socket1 && this.socket2) {
      this.socket1.emit('game-over', 3);
      this.socket2.emit('game-over', 3);
    }
  }

  draw = () => {
    if (this.player1.getHealth() == 0 && this.player2.getHealth() == 0) {
      this.socket1.emit('game-over', 0);
      this.socket2.emit('game-over', 0);
    } else if (this.player1.getHealth() <= 0) {
      this.socket1.emit('game-over', 2);
      this.socket2.emit('game-over', 2);
    } else if (this.player2.getHealth() <= 0) {
      this.socket1.emit('game-over', 1);
      this.socket2.emit('game-over', 1);
    }
    this.socket1.emit("render");
    this.socket2.emit("render");
  };

  checkLeft = () => {
    const player1Pos = this.player1.getInfo();
    const player2Pos = this.player2.getInfo();
    if (player1Pos[0] > player2Pos[0]) {
      this.player1.setLeft(true);
      this.player2.setLeft(false);
    } else if (player1Pos[0] <= player2Pos[0]) {
      this.player1.setLeft(false);
      this.player2.setLeft(true);
    }
  };

  // check for player collision
  checkPlayerCollision = () => {
    const player1Pos = this.player1.getInfo();
    const player2Pos = this.player2.getInfo();
    let colliding = false;
    if (
      // collide with each other
      player1Pos[0] + 90 >= player2Pos[0] - 90 &&
      player1Pos[0] - 90 <= player2Pos[0] + 90 &&
      player1Pos[1] <= player2Pos[1] + 300 &&
      player1Pos[1] + 300 >= player2Pos[1]
    ) {
      if (!player1Pos[3] && player2Pos[3]) {
        this.player1.setCollide("right");
        this.player2.setCollide("left");
        colliding = true;
      } else if (player1Pos[3] && !player2Pos[3]) {
        this.player1.setCollide("left");
        this.player2.setCollide("right");
        colliding = true;
      }
    }

    if (player2Pos[0] + 95 >= 2000 && player2Pos[3]) {
      // collide with wall
      colliding = true;
      this.player2.setCollide("right");
    } else if (player1Pos[0] + 95 >= 2000 && player1Pos[3]) {
      // collide with wall
      colliding = true;
      this.player1.setCollide("right");
    } else if (player2Pos[0] - 95 <= 0 && !player2Pos[3]) {
      // collide with wall
      colliding = true;
      this.player2.setCollide("left");
    } else if (player1Pos[0] - 95 <= 0 && !player1Pos[3]) {
      // collide with wall
      colliding = true;
      this.player1.setCollide("left");
    }

    if (!colliding) {
      this.player1.setCollide("none");
      this.player2.setCollide("none");
    }
  };

  // check for attack collision
  checkAttackCollision = () => {
    const player1Pos = this.player1.getInfo();
    const player2Pos = this.player2.getInfo();
    let attackCollisionPos1 = this.player1.getAttackCollision() ? this.player1.getAttackCollision() : [];
    let attackCollisionPos2 = this.player2.getAttackCollision() ? this.player2.getAttackCollision() : [];

    for (let i = 0; i < attackCollisionPos1.length; i++) {
      // check if first player is dealing damage
      if (attackCollisionPos1[i]) {
        const damage = this.player2.isBlocking() ? attackCollisionPos1[i][4] / 2 : attackCollisionPos1[i][4];
        if (
          attackCollisionPos1[i][0] + attackCollisionPos1[i][2] >= player2Pos[0] - 75  &&
          attackCollisionPos1[i][0] <= player2Pos[0] + 75 &&
          attackCollisionPos1[i][1] <= player2Pos[1] &&
          attackCollisionPos1[i][1] + attackCollisionPos1[i][3] >= player2Pos[1] - 400
        ) {
          this.player2.setHealth(this.player2.getHealth() - damage);
          this.player2.setKnockback(attackCollisionPos1[i][5], true);
          this.player1.removeAttackCollision(attackCollisionPos1[i][5]);
          this.socket1.emit("damage", [2, this.player2.getHealth()]);
          this.socket2.emit("damage", [2, this.player2.getHealth()]);
        } else if (
          attackCollisionPos1[i][0] >= player2Pos[0] - 75 &&
          attackCollisionPos1[i][0] + attackCollisionPos1[i][2] <= player2Pos[0] + 75 &&
          attackCollisionPos1[i][1] <= player2Pos[1] &&
          attackCollisionPos1[i][1] + attackCollisionPos1[i][3] >= player2Pos[1] - 400
        ) {
          this.player2.setHealth(this.player2.getHealth() - damage);
          this.player2.setKnockback(attackCollisionPos1[i][5], true);
          this.player1.removeAttackCollision(attackCollisionPos1[i][5]);
          this.socket1.emit("damage", [2, this.player2.getHealth()]);
          this.socket2.emit("damage", [2, this.player2.getHealth()]);
        }
      }
    }

    for (let i = 0; i < attackCollisionPos2.length; i++) {
      // check if second player is dealing damage
      if (attackCollisionPos2[i]) {
        const knockback = this.player1.isBlocking() ? 2 : 5;
        const damage = this.player1.isBlocking() ? attackCollisionPos2[i][4] / 2 : attackCollisionPos2[i][4];
        if (
          attackCollisionPos2[i][0] + attackCollisionPos2[i][2] >= player1Pos[0] - 75 &&
          attackCollisionPos2[i][0] <= player1Pos[0] + 75 &&
          attackCollisionPos2[i][1] <= player1Pos[1] &&
          attackCollisionPos2[i][1] + attackCollisionPos2[i][3] >= player1Pos[1] - 400
        ) {
          this.player1.setHealth(this.player1.getHealth() - damage);
          this.player1.setKnockback(attackCollisionPos2[i][5], true);
          this.player2.removeAttackCollision(attackCollisionPos2[i][5]);
          this.socket1.emit("damage", [1, this.player1.getHealth()]);
          this.socket2.emit("damage", [1, this.player1.getHealth()]);
        } else if (
          attackCollisionPos2[i][0] >= player1Pos[0] - 75 &&
          attackCollisionPos2[i][0] + attackCollisionPos2[i][2] <= player1Pos[0] + 75 &&
          attackCollisionPos2[i][1] <= player1Pos[1] &&
          attackCollisionPos2[i][1] + attackCollisionPos2[i][3] >= player1Pos[1] - 400
        ) {
          this.player1.setHealth(this.player1.getHealth() - damage);
          this.player1.setKnockback(attackCollisionPos2[i][5], true);
          this.player2.removeAttackCollision(attackCollisionPos2[i][5]);
          this.socket1.emit("damage", [1, this.player1.getHealth()]);
          this.socket2.emit("damage", [1, this.player1.getHealth()]);
        }
      }
    }
  };

  getGood = () => {
    if (this.socket1 && this.socket2) {
      return this.socket1.connected && this.socket2.connected;
    } else {
      return false;
    }
  }

  addPlayer1 = (player) => {
    this.socket1 = player;
    this.player1 = new Player(2000 / 3, 950)
  }

  addPlayer2 = (player) => {
    this.socket2 = player;
    this.player2 = new Player(2000 * 2 / 3, 950)
  }

  remPlayers = () => {
    this.socket1 = null;
    this.socket2 = null;
  }

  hasPlayer = (player) => {
    if (this.socket1 == player || this.socket2 == player) {
      return true;
    } else {
      return false;
    }
  }
}

export { Game };
