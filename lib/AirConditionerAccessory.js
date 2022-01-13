const BaseAccessory = require('./BaseAccessory');

const STATE_OTHER = 0;

class AirConditionerAccessory extends BaseAccessory {
    static getCategory(Categories) {
        return Categories.AIR_CONDITIONER;
    }

    constructor(...props) {
        super(...props);


    }

    _registerPlatformAccessory() {
        const {Service} = this.hap;

        this.accessory.addService(Service.HeaterCooler, this.device.context.name);

        super._registerPlatformAccessory();
    }

    _registerCharacteristics(dps) {
        const {Service, Characteristic} = this.hap;
        const service = this.accessory.getService(Service.HeaterCooler);
        this._checkServiceName(service, this.device.context.name);

        const characteristicActive = service.getCharacteristic(Characteristic.Active)
            .updateValue(this._getActive(dps['1']))
            .on('get', this.getActive.bind(this))
            .on('set', this.setActive.bind(this));


        const _validCurrentHeaterCoolerStateValues = [STATE_OTHER];
        _validCurrentHeaterCoolerStateValues.unshift(Characteristic.CurrentHeaterCoolerState.HEATING);
        _validCurrentHeaterCoolerStateValues.unshift(Characteristic.CurrentHeaterCoolerState.COOLING);
        _validCurrentHeaterCoolerStateValues.unshift(Characteristic.CurrentHeaterCoolerState.IDLE);

        const _validTargetHeaterCoolerStateValues = [STATE_OTHER];
        _validTargetHeaterCoolerStateValues.unshift(Characteristic.TargetHeaterCoolerState.COOL);
        _validTargetHeaterCoolerStateValues.unshift(Characteristic.TargetHeaterCoolerState.HEAT);
        _validTargetHeaterCoolerStateValues.unshift(Characteristic.TargetHeaterCoolerState.AUTO);



        let characteristicCurrentTemperature;
        characteristicCurrentTemperature = service.getCharacteristic(Characteristic.CurrentTemperature)
            .updateValue(dps['3'])
            .on('get', this.getState.bind(this, '3'));



        let characteristicSwingMode;
        characteristicSwingMode = service.getCharacteristic(Characteristic.SwingMode)
            .updateValue(this._getSwingMode(dps['104']))
            .on('get', this.getSwingMode.bind(this))
            .on('set', this.setSwingMode.bind(this));

        let characteristicCoolingThresholdTemperature;
        characteristicCoolingThresholdTemperature = service.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 31,
                minStep: 1
            })
            .updateValue(dps['2'])
            .on('get', this.getState.bind(this, '2'))
            .on('set', this.setTargetThresholdTemperature.bind(this, 'cooling'));

        let characteristicHeatingThresholdTemperature;
        characteristicHeatingThresholdTemperature = service.getCharacteristic(Characteristic.HeatingThresholdTemperature)
            .setProps({
                minValue: 16,
                maxValue: 31,
                minStep: 1
            })
            .updateValue(dps['2'])
            .on('get', this.getState.bind(this, '2'))
            .on('set', this.setTargetThresholdTemperature.bind(this, 'heating'));

        let characteristicRotationSpeed;
        characteristicRotationSpeed = service.getCharacteristic(Characteristic.RotationSpeed)
            .updateValue(this._getRotationSpeed(dps))
            .on('get', this.getRotationSpeed.bind(this))
            .on('set', this.setRotationSpeed.bind(this));

        // this.characteristicCurrentHeaterCoolerState = characteristicCurrentHeaterCoolerState;
        this.characteristicCoolingThresholdTemperature = characteristicCoolingThresholdTemperature;
        this.characteristicHeatingThresholdTemperature = characteristicHeatingThresholdTemperature;
        this.characteristicActive = characteristicActive;
        this.characteristicCurrentTemperature = characteristicCurrentTemperature;

        let characteristicTargetHeaterCoolerState;
        characteristicTargetHeaterCoolerState = service.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .setProps({
                maxValue: 3,
                validValues: _validTargetHeaterCoolerStateValues
            })
            .updateValue(this._getTargetHeaterCoolerState(dps['4']))
            .on('get', this.getTargetHeaterCoolerState.bind(this))
            .on('set', this.setTargetHeaterCoolerState.bind(this));

        let characteristicCurrentHeaterCoolerState;
        characteristicCurrentHeaterCoolerState = service.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .setProps({
                maxValue: 3,
                validValues: _validCurrentHeaterCoolerStateValues
            })
            .updateValue(this._getCurrentHeaterCoolerState(dps['4']))
            .on('get', this.getCurrentHeaterCoolerState.bind(this));

        this.characteristicTargetHeaterCoolerState = characteristicTargetHeaterCoolerState;
        this.characteristicCurrentHeaterCoolerState = characteristicCurrentHeaterCoolerState;

        this.device.on('change', (changes, state) => {

            this.log(`Update from ${this.device.context.name} (${this.device.context.type}:${this.device.context.version}) with signature ${JSON.stringify(this.device.state)}`);

            if (changes.hasOwnProperty('1')) {
              characteristicActive.updateValue(this._getActive(changes['1']));
            }

            if (changes.hasOwnProperty('2')) {
                characteristicCoolingThresholdTemperature.updateValue(changes['2']);
                characteristicHeatingThresholdTemperature.updateValue(changes['2']);
            }

            if (changes.hasOwnProperty('3')) {
              characteristicCurrentTemperature.updateValue(changes['3']);

              if (changes['3'] > changes['2']) {
                  characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.COOLING);
              } else if (changes['3'] == changes['2']){
                  characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.IDLE);
              } else if (changes['3'] < changes['2']){
                  characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.HEATING);
              }
            }

            if (changes.hasOwnProperty('4')) {
                const newTargetHeaterCoolerState = this._getTargetHeaterCoolerState(changes['4']);
                const newCurrentHeaterCoolerState = this._getCurrentHeaterCoolerState(changes['4']);
                characteristicTargetHeaterCoolerState.updateValue(newTargetHeaterCoolerState);
                characteristicCurrentHeaterCoolerState.updateValue(newCurrentHeaterCoolerState);
            }

            if (changes.hasOwnProperty('104')) {
                const newSwingMode = this._getSwingMode(changes['104']);
                characteristicSwingMode.updateValue(newSwingMode);
            }

            if (changes.hasOwnProperty('5')) {
                const newRotationSpeed = this._getRotationSpeed(state);
                characteristicRotationSpeed.updateValue(newRotationSpeed);
            }
        });
    }

    getActive(callback) {
        this.getState('1', (err, dp) => {
            if (err) return callback(err);

            callback(null, this._getActive(dp));
        });
    }

    _getActive(dp) {
        const {Characteristic} = this.hap;

        return dp ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
    }

    setActive(value, callback) {
        const {Characteristic} = this.hap;
        console.log("setting state");
        if (this.characteristicActive.value !== value) {
          switch (value) {
              case Characteristic.Active.ACTIVE:
                  callback();
                  return setTimeout(() => { this.setState('1', true); }, 1000);

              case Characteristic.Active.INACTIVE:
                  return this.setState('1', false, callback);
          }
        }

        callback();
    }


    getCurrentHeaterCoolerState(callback) {
        this.getState('4', (err, dp) => {
            if (err) return callback(err);

            callback(null, this._getCurrentHeaterCoolerState(dp));
        });
    }

    _getCurrentHeaterCoolerState(dp) {
        const {Characteristic} = this.hap;

        switch (dp) {
            case "cold":
                return Characteristic.CurrentHeaterCoolerState.COOLING;

            case "hot":
                return Characteristic.CurrentHeaterCoolerState.HEATING;

            case "auto":

                if (this.characteristicCurrentTemperature.value < this.characteristicHeatingThresholdTemperature.value) {
                    return Characteristic.CurrentHeaterCoolerState.HEATING;
                } else if (this.characteristicCurrentTemperature.value > this.characteristicCoolingThresholdTemperature.value) {
                    return Characteristic.CurrentHeaterCoolerState.COOLING;
                }

            default:
                return Characteristic.CurrentHeaterCoolerState.IDLE;
        }
    }

    getTargetHeaterCoolerState(callback) {
        this.getState('4', (err, dp) => {
            if (err) return callback(err);

            callback(null, this._getTargetHeaterCoolerState(dp));
        });
    }

    _getTargetHeaterCoolerState(dp) {
        const {Characteristic} = this.hap;

        switch (dp) {
            case "cold":
                return Characteristic.TargetHeaterCoolerState.COOL;

            case "hot":
                return Characteristic.TargetHeaterCoolerState.HEAT;

            case "auto":
                return Characteristic.TargetHeaterCoolerState.AUTO;

            default:
                return STATE_OTHER;

        }
    }

    setTargetHeaterCoolerState(value, callback) {
        const {Characteristic} = this.hap;

        switch (value) {
            case Characteristic.TargetHeaterCoolerState.COOL:
                // this.characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.COOLING);
                return this.setMultiState({'1': true, '4': "cold"}, callback);

            case Characteristic.TargetHeaterCoolerState.HEAT:
                // this.characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.HEATING);
                return this.setMultiState({'1': true, '4': "hot"}, callback);

            case Characteristic.TargetHeaterCoolerState.AUTO:
                // this.characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.IDLE);
                return this.setMultiState({'1': true, '4': "auto"}, callback);

        }

        callback();
    }

    getSwingMode(callback) {
        this.getState('104', (err, dp) => {
            if (err) return callback(err);

            callback(null, this._getSwingMode(dp));
        });
    }

    _getSwingMode(dp) {
        const {Characteristic} = this.hap;

        return dp ? Characteristic.SwingMode.SWING_ENABLED : Characteristic.SwingMode.SWING_DISABLED;
    }

    setSwingMode(value, callback) {
        if (this.device.context.noSwing) return callback();

        const {Characteristic} = this.hap;

        switch (value) {
            case Characteristic.SwingMode.SWING_ENABLED:
                return this.setState('104', true, callback);

            case Characteristic.SwingMode.SWING_DISABLED:
                return this.setState('104', false, callback);
        }

        callback();
    }

    setTargetThresholdTemperature(mode, value, callback) {
        const {Characteristic} = this.hap;
        var state = "auto";

        var active = this.characteristicActive.value == Characteristic.Active.ACTIVE;

        switch (this.characteristicTargetHeaterCoolerState.value ) {
            case Characteristic.TargetHeaterCoolerState.COOL:
                state = "cold";
                if (!active && this.characteristicCurrentTemperature.value < value) {
                    state = "hot";
                }
                break;

            case Characteristic.TargetHeaterCoolerState.HEAT:
                state = "hot";
                if (!active && this.characteristicCurrentTemperature.value >= value) {
                    state = "cold";
                }
                break;

            case Characteristic.TargetHeaterCoolerState.AUTO:
                state = "auto";
                if (!active) {
                  if (this.characteristicCurrentTemperature.value >= value) {
                      state = "cold";
                  } else {
                      state = "hot";
                  }
                }
                if (this.characteristicCurrentTemperature.value > value) {
                    this.characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.COOLING);
                } else if (this.characteristicCurrentTemperature.value == value) {
                  this.characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.IDLE);
                } else if (this.characteristicCurrentTemperature.value < value) {
                    this.characteristicCurrentHeaterCoolerState.updateValue(Characteristic.CurrentHeaterCoolerState.HEATING);
                }

                break;
        }

        this.setMultiState({'1': true, '2': value, '4': state} , err => {
            if (err) return callback(err);

            this.characteristicHeatingThresholdTemperature.updateValue(value);
            this.characteristicCoolingThresholdTemperature.updateValue(value);

          callback();
        });
    }


    getRotationSpeed(callback) {
        this.getState(['5'], (err, dps) => {
            if (err) return callback(err);

            callback(null, this._getRotationSpeed(dps));
        });
    }

    _getRotationSpeed(dps) {

        if (this._hkRotationSpeed) {
            const currntRotationSpeed = this.convertRotationSpeedFromHomeKitToTuya(this._hkRotationSpeed);

            return currntRotationSpeed === dps['5'] ? this._hkRotationSpeed : this.convertRotationSpeedFromTuyaToHomeKit(dps['5']);
        }

        return this._hkRotationSpeed = this.convertRotationSpeedFromTuyaToHomeKit(dps['5']);
    }

    setRotationSpeed(value, callback) {
        const {Characteristic} = this.hap;

         if (value === 0) {
             this.setActive(Characteristic.Active.INACTIVE, callback);
         } else {
             this._hkRotationSpeed = value;
             this.setMultiState({'1': true, '5': this.convertRotationSpeedFromHomeKitToTuya(value)}, callback);
         }

    }

    convertRotationSpeedFromTuyaToHomeKit(value) {
        const _rotationStops = {
          1: 75,
          2: 50,
          3: 25,
          4: 100
        };
        return _rotationStops[value];
    }

    convertRotationSpeedFromHomeKitToTuya(value) {
        const _rotationSteps = [
          3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
          2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4
        ];
        return '' + _rotationSteps[value];
    }
}

module.exports = AirConditionerAccessory;
