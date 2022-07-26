import e from "express";
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
              this.socket1.emit('game-over', true);
              this.socket2.emit('game-over', false);
            } else if (this.player1.getHealth() < this.player2.getHealth()) {
              this.socket1.emit('game-over', false);
              this.socket2.emit('game-over', true);
            } else {
              this.socket1.emit('game-over', false);
              this.socket2.emit('game-over', false);
            }
        }
      } else {
        this.time = 20;
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
      this.socket1.emit('game-over', true);
      this.socket2.emit('game-over', true);
    }
  }

  draw = () => {
    if (this.isGood) {
      if (this.player1.getHealth() == 0 && this.player2.getHealth() == 0) {
        this.isGood = false;
        this.socket1.emit('game-over', false);
        this.socket2.emit('game-over', false);
      } else if (this.player1.getHealth() <= 0) {
        this.isGood = false;
        this.socket1.emit('game-over', false);
        this.socket2.emit('game-over', true);
        this.isGood = false;
      } else if (this.player2.getHealth() <= 0) {
        this.socket1.emit('game-over', true);
        this.socket2.emit('game-over', false);
      }
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
    let colliding1Left = false;
    let colliding1Right = false;
    let colliding2Left = false;
    let colliding2Right = false;
    if (
      // collide with each other
      player1Pos[0] + player1Pos[4] / 3 >= player2Pos[0] - player2Pos[4] / 3 &&
      player1Pos[0] - player1Pos[4] / 3 <= player2Pos[0] + player2Pos[4] / 3 &&
      player1Pos[1] <= player2Pos[1] + player2Pos[5] - 100 &&
      player1Pos[1] + player1Pos[5] - 100 >= player2Pos[1]
    ) {
      if (!player1Pos[3] && player2Pos[3]) {
        colliding1Right = true;
        colliding2Left = true;
      } else if (player1Pos[3] && !player2Pos[3]) {
        colliding2Right = true;
        colliding1Left = true;
      }
    }

    if (player2Pos[0] + player2Pos[4] / 3 >= 2000 && player2Pos[3]) {
      // collide with wall
      colliding2Right = true;
    }
    if (player1Pos[0] + player1Pos[4] / 3 >= 2000 && player1Pos[3]) {
      // collide with wall
      colliding1Right = true;
    }
    if (player2Pos[0] - player2Pos[4] / 3 <= 0 && !player2Pos[3]) {
      // collide with wall
      colliding2Left = true;
    }
    if (player1Pos[0] - player1Pos[4] / 3 <= 0 && !player1Pos[3]) {
      // collide with wall
      colliding1Left = true;
    }

    if (colliding1Left) {
      this.player1.setCollide("left");
    } else {
      this.player1.setCollide("nLeft");
    }
    if (colliding1Right) {
      this.player1.setCollide("right");
    } else {
      this.player1.setCollide("nRight");
    }
    if (colliding2Left) {
      this.player2.setCollide("left");
    } else {
      this.player2.setCollide("nLeft");
    }
    if (colliding2Right) {
      this.player2.setCollide("right");
    } else {
      this.player2.setCollide("nRight");
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
        if (attackCollisionPos1[i][0] <= 0 || attackCollisionPos1[i][0] >= 2000) {
          this.player1.removeAttackCollision(i);
          continue;
        }
        const damage = this.player2.isBlocking() ? attackCollisionPos1[i][4] / 2 : attackCollisionPos1[i][4];
        if (
          attackCollisionPos1[i][0] + attackCollisionPos1[i][2] >= player2Pos[0] - player2Pos[4] / 3  &&
          attackCollisionPos1[i][0] <= player2Pos[0] + player1Pos[4] / 3 &&
          attackCollisionPos1[i][1] <= player2Pos[1] &&
          attackCollisionPos1[i][1] + attackCollisionPos1[i][3] >= player2Pos[1] - player2Pos[5]
        ) {
          this.player2.setHealth(this.player2.getHealth() - damage);
          this.player2.setKnockback(attackCollisionPos1[i][5], true, this.player2.isBlocking());
          this.player1.removeAttackCollision(i);
          this.socket1.emit("damage", [2, this.player2.getHealth()]);
          this.socket2.emit("damage", [2, this.player2.getHealth()]);
        } else if (
          attackCollisionPos1[i][0] >= player2Pos[0] - player2Pos[4] / 3 &&
          attackCollisionPos1[i][0] + attackCollisionPos1[i][2] <= player2Pos[0] + player2Pos[4] / 3 &&
          attackCollisionPos1[i][1] <= player2Pos[1] &&
          attackCollisionPos1[i][1] + attackCollisionPos1[i][3] >= player2Pos[1] - player2Pos[5]
        ) {
          this.player2.setHealth(this.player2.getHealth() - damage);
          this.player2.setKnockback(attackCollisionPos1[i][5], true, this.player2.isBlocking());
          this.player1.removeAttackCollision(i);
          this.socket1.emit("damage", [2, this.player2.getHealth()]);
          this.socket2.emit("damage", [2, this.player2.getHealth()]);
        }
      }
    }
    
    for (let i = 0; i < attackCollisionPos2.length; i++) {
      // check if second player is dealing damage
      if (attackCollisionPos2[i]) {
        if (attackCollisionPos2[i][0] <= 0 || attackCollisionPos2[i][0] >= 2000) {
          this.player2.removeAttackCollision(i);
          continue;
        }
        const damage = this.player1.isBlocking() ? attackCollisionPos2[i][4] / 2 : attackCollisionPos2[i][4];
        if (
          attackCollisionPos2[i][0] + attackCollisionPos2[i][2] >= player1Pos[0] - player1Pos[4] / 3 &&
          attackCollisionPos2[i][0] <= player1Pos[0] + player1Pos[4] / 3 &&
          attackCollisionPos2[i][1] <= player1Pos[1] &&
          attackCollisionPos2[i][1] + attackCollisionPos2[i][3] >= player1Pos[1] - player1Pos[5]
        ) {
          this.player1.setHealth(this.player1.getHealth() - damage);
          this.player1.setKnockback(attackCollisionPos2[i][5], true, this.player1.isBlocking());
          this.player2.removeAttackCollision(i);
          this.socket1.emit("damage", [1, this.player1.getHealth()]);
          this.socket2.emit("damage", [1, this.player1.getHealth()]);
        } else if (
          attackCollisionPos2[i][0] >= player1Pos[0] - player1Pos[4] / 3 &&
          attackCollisionPos2[i][0] + attackCollisionPos2[i][2] <= player1Pos[0] + player1Pos[4] / 3 &&
          attackCollisionPos2[i][1] <= player1Pos[1] &&
          attackCollisionPos2[i][1] + attackCollisionPos2[i][3] >= player1Pos[1] - player1Pos[5]
        ) {
          this.player1.setHealth(this.player1.getHealth() - damage);
          this.player1.setKnockback(attackCollisionPos2[i][5], true, this.player1.isBlocking());
          this.player2.removeAttackCollision(i);
          this.socket1.emit("damage", [1, this.player1.getHealth()]);
          this.socket2.emit("damage", [1, this.player1.getHealth()]);
        }
      }
    }
  };

  getGood = () => {
    if (this.socket1 && this.socket2) {
      this.isGood = this.socket1.connected && this.socket2.connected;
      return this.isGood;
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
