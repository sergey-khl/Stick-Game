class Player {
  constructor(initx, inity) {
    this.health = 100;
    this.jumping = false;
    this.crouching = false;
    this.animation = "idle";
    this.width = 250;
    this.height = 400;
    this.position = [initx, inity]
    this.velocity = [0, 0];
    this.acceleration = [0, 0];
    this.standing_height = inity;
    this.last_key;
    this.keys = { 'w': false, 'a': false, 's': false, 'd': false, 'punch': false, 'kick': false };
    this.curr_move = "none";
    this.delta = 1;
    this.frame_count = 0;
    this.left;
    this.attacking = false;
    this.hitting = false;
    this.collidingLeft = false;
    this.collidingRight = false;
    this.knockback = '';
    this.cooldowns = { 'throw_shurikens': 0, 'throw_shurikens_max': 1, 'sweep': 0, 'sweep_max': 2, 'punch': 0, 'kick': 0 };

    this.attackCollisionPos = [];
  }

  updateMovement = () => {
    // move any projectiles and attacks first
    let newAttackCollisionPos = [];
    
    if (this.attackCollisionPos) {
      for (let i = 0; i < this.attackCollisionPos.length; i++) {
        if (this.attackCollisionPos[i]) {
          if (this.attackCollisionPos[i][5] == 'punch') {
            newAttackCollisionPos.push([this.position[0], this.position[1] - 300, this.attackCollisionPos[i][2], this.attackCollisionPos[i][3], this.attackCollisionPos[i][4], this.attackCollisionPos[i][5]]);
          } else if (this.attackCollisionPos[i][5] == 'kick') {
            newAttackCollisionPos.push([this.position[0], this.position[1] - 240, this.attackCollisionPos[i][2], this.attackCollisionPos[i][3], this.attackCollisionPos[i][4], this.attackCollisionPos[i][5]]);
          } else if (this.attackCollisionPos[i][5] == 'throw_shurikens') {
            newAttackCollisionPos.push([this.attackCollisionPos[i][0] + (this.left ? -15 : 15), this.attackCollisionPos[i][1], this.attackCollisionPos[i][2], this.attackCollisionPos[i][3], this.attackCollisionPos[i][4], this.attackCollisionPos[i][5]]);
          } else if (this.attackCollisionPos[i][5] == 'sweep') {
            newAttackCollisionPos.push([this.position[0] + (this.left ? -75 : 75), this.position[1] - 150, this.attackCollisionPos[i][2], this.attackCollisionPos[i][3], this.attackCollisionPos[i][4], this.attackCollisionPos[i][5]]);
          }
        }
      } 
      this.setAttackCollision(newAttackCollisionPos);
    }

    // update cooldowns
    Object.keys(this.cooldowns).map((key) => {
      if (key != 'throw_shurikens_max' && key != 'sweep_max') {
        if (this.cooldowns[key] > 0) {
          this.cooldowns[key] -= 1/60;
        } else {
          this.cooldowns[key] = 0;
        }
      }
    });
    

    if (this.knockback != '') { // we are being knocked back
      this.frame_count += 1;
      if (this.knockback == 'punch') {
        if (this.frame_count <= 21) {
          this.velocity[0] = this.left ? 10 : -10;
        } else {
          this.velocity[0] = 0;
          this.frame_count = 0;
          this.setKnockback('', false);
        }
      } else if (this.knockback == 'kick') {
        if (this.frame_count <= 24) {
          this.velocity[0] = this.left ? 15 : -15;
        } else {
          this.velocity[0] = 0;
          this.frame_count = 0;
          this.setKnockback('', false);
        }
      } else if (this.knockback == 'throw_shurikens') {
        if (this.frame_count <= 12) {
          this.velocity[0] = this.left ? 2 : -2;
        } else {
          this.velocity[0] = 0;
          this.frame_count = 0;
          this.setKnockback('', false);
        }
      } else if (this.knockback == 'sweep') {
        if (this.frame_count == 1) {
          this.velocity[0] = 0;
          this.animation = 'stun_fall';
        } else if (this.frame_count >= 61) {
          this.frame_count = 0;
          this.setKnockback('', false);
        }
      }
    } else {
      // go frame by frame through an attack
      if (this.attacking) {
        this.frame_count += 1;
        if (this.animation == 'punch') {
          if (this.frame_count == 8) {
            this.velocity[0] = this.left ? -10 : 10;
            this.addAttackCollision(
              this.position[0],
              this.position[1] - 300,
              (this.left ? -150 : 150),
              70,
              10,
              'punch'
            );
          } else if (this.frame_count == 17) {
            this.velocity[0] = this.left ? -5 : 5;
            this.removeAttackCollision('punch');
          } else if (this.frame_count >= 29) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        } else if (this.animation == 'kick') {
          if (this.frame_count == 15) {
            this.velocity[0] = this.left ? -2 : 2;
            this.addAttackCollision(
              this.position[0],
              this.position[1] - 240,
              (this.left ? -200 : 200),
              70,
              15,
              'kick'
            );
          } else if (this.frame_count == 30) {
            this.velocity[0] = this.left ? -10 : 10;
            this.removeAttackCollision('kick');
          } else if (this.frame_count >= 35) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        } else if (this.animation == 'throw_shurikens') {
          if (this.frame_count == 14) {
            this.addAttackCollision(
              this.position[0] + (this.left ? -95 + 25 : 95 - 25),
              this.position[1] - 170 + 25,
              (this.left ? -50 : 50),
              50,
              10,
              'throw_shurikens'
            );
          } else if (this.frame_count >= 23) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        } else if (this.animation == 'sweep') {
          if (this.frame_count == 20) {
            this.addAttackCollision(
              this.position[0] + (this.left ? -75 : 75),
              this.position[1] - 150,
              (this.left ? -170 : 170),
              150,
              15,
              'sweep'
            );
          } else if (this.frame_count == 32) {
            this.velocity[0] = this.left ? -5 : 5;
            this.removeAttackCollision('sweep');
          }  else if (this.frame_count >= 41) {
            this.frame_count = 0;
            this.velocity[0] = 0;
            this.attacking = false;
          }
        }
      }
      
      // start an attack, start init speed here
      if (this.keys['punch'] && !this.attacking && !this.jumping && this.cooldowns['punch'] == 0) {
        this.cooldowns['punch'] = 0.5;
        this.attacking = true;
        this.crouching = false;
        this.animation = 'punch';
        this.velocity[0] = this.left ? -5 : 5;
      } else if (this.keys['kick'] && !this.attacking && !this.jumping && this.cooldowns['kick'] == 0) {
        this.cooldowns['kick'] = 0.5;
        this.attacking = true;
        this.crouching = false;
        this.animation = 'kick';
        this.velocity[0] = this.left ? -10 : 10;
      } else if (this.keys['throw'] && !this.attacking && !this.jumping && this.cooldowns['throw_shurikens'] == 0) {
        this.cooldowns['throw_shurikens'] = this.cooldowns['throw_shurikens_max'];
        this.attacking = true;
        this.crouching = false;
        this.animation = 'throw_shurikens';
        this.velocity[0] = 0;
      } else if (this.keys['sweep'] && !this.attacking && !this.jumping && this.cooldowns['sweep'] == 0) {
        this.cooldowns['sweep'] = this.cooldowns['sweep_max'];
        this.attacking = true;
        this.crouching = false;
        this.animation = 'sweep';
        this.velocity[0] = 0;
      }

      // basic movement
      if (!this.attacking) {
        this.crouching = false;
        if (this.keys['d'] && this.keys['last'] == 'd') {
          this.animation = 'walk';
          this.velocity[0] = 10;
        } else if (this.keys['a'] && this.keys['last'] == 'a') {
          this.animation = 'walk';
          this.velocity[0] = -10;
        } else if (!this.keys['a'] && !this.keys['d']) {
          this.animation = 'idle';
          this.velocity[0] = 0;
        }
    
        if (!this.keys['a'] && !this.keys['d'] && !this.jumping && this.keys['s'] && !this.crouching) {
          this.crouching = true;
          this.animation = 'crouch';
        }

        if (!this.keys['block']) {
          this.blocking = false;
        } else if (this.keys['block'] && !this.jumping) {
          if (this.crouching) {
            this.animation = 'block_c';
          } else {
            this.animation = 'block_s';
          }
          this.blocking = true;
        }

    
        if (this.keys['w'] && !this.jumping) {
          this.animation = 'jump';
          this.jumping = true;
          this.crouching = false;
          this.velocity[1] = -47;
        }

        // jumping
        if (this.jumping) {
          this.animation = 'jump';
        }
      }
    }
    // change dimensions if necessary
    if (this.animation == 'stun_fall') {
      this.width = 450;
      this.height = 100;
    } else {
      this.width = 250;
      this.height = 400;
    }
    // gravity
    if (this.position[1] <= this.standing_height) {
      this.acceleration[1] = 2.5;
    } else {
      this.acceleration[1] = 0;
      this.jumping = false;
      this.position[1] = this.standing_height;
    }
    // deny movement if collision
    if (this.collidingLeft && this.velocity[0] < 0) {
      this.velocity[0] = 0;
    }  else if (this.collidingRight && this.velocity[0] > 0) {
      this.velocity[0] = 0;
    }
  };

  updatePosition() {
    this.position[0] += this.velocity[0] * this.delta;
    this.position[1] += this.velocity[1] * this.delta;
    this.velocity[0] += this.acceleration[0] * this.delta;
    this.velocity[1] += this.acceleration[1] * this.delta;
  }
  
  addAttackCollision = (x, y, width, height, damage, attack) => {
    if (x && y && width && height && damage && attack) {
      this.attackCollisionPos.push([x, y, width, height, damage, attack]);
    }
  }

  removeAttackCollision = (attack) => {
    const index = this.attackCollisionPos.indexOf(attack);
    this.attackCollisionPos.splice(index, 1);
  }

  getAttackCollision = () => {
    return this.attackCollisionPos;
  }

  getHealth = () => {
    return this.health;
  };

  getInfo = () => {
    return [this.position[0], this.position[1], this.animation, this.left, this.width, this.height];
  };

  getCooldowns = () => {
    return this.cooldowns;
  }

  isBlocking = () => {
    return this.blocking;
  }

  setAttackCollision = (attackCollision) => {
    this.attackCollisionPos = attackCollision;
  };


  // indicate where the player is touching another
  setCollide = (collision) => {
    if (collision == "left") {
      this.collidingLeft = true;
    } else if (collision == "right") {
      this.collidingRight = true;
    } else if (collision == "nLeft") {
      this.collidingLeft = false;
    } else if (collision == "nRight") {
      this.collidingRight = false;
    }
  };

  setKeys = (keys) => {
    this.keys = keys;
  }

  setDelta = (delta) => {
    this.delta = delta;
  }

  setHealth = (health) => {
    this.health = health;
  };

  setKnockback = (knock_attack, is_new) => {
    if (is_new) {
      this.frame_count = 0;
    }
    this.knockback = knock_attack;
  }

  setLeft = (left) => {
    this.left = left;
  };
}


export { Player };