'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //To get Unique id.
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; //In km
    this.duration = duration; // In min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  name;
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription(); //Create description for list {constructor of this will get access to parent}
  }

  calcPace() {
    //Min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  name;
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription(); //Create description for list {constructor of this will get access to parent}
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //hrs to min;
    return this.speed;
  }
}

//Experiment
// const running = new Running([39, -12], 5.2, 24, 178);
// const cycling = new Cycling([39, -12], 27, 95, 523);
// console.log(running, cycling);

//Required html elements

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//Application Architecture
class App {
  //Private Variables
  #map;
  #mapEvent;
  //Workout array
  #workouts = [];
  #zoomLevel = 13;

  constructor() {
    //Get user position
    this._getPosition();

    //Get Local Storage items
    this._getLocalStorage();

    //On Enter
    form.addEventListener('submit', this._newWorkout.bind(this)); //'this' in eventHandler is point to the DOM element to which it attached.

    //Drop down Change
    inputType.addEventListener('change', this._toggleElevationField);

    //On click on list focus popup on map
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    //This function can be access in this class and its inherited class (Protected)
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), //Regular function 'this' key is Undefine that's why we are bind 'this' to function
        function () {
          //Error
          alert('Please allow to get your location');
        }
      );
  }

  _loadMap(position) {
    //Success
    const { latitude, longitude } = position.coords; //{Destructing} Its same as latitude = position.cords.latitude / longitude = position.cords.longitude
    // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);

    //Leaflet implementation
    const cords = [latitude, longitude];
    this.#map = L.map('map').setView(cords, this.#zoomLevel); //Cords, Zoom

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot//{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //On Map Click
    this.#map.on('click', this._showForm.bind(this));

    //Render marker workout array, after leaflet load
    this.#workouts.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(event) {
    this.#mapEvent = event;
    //Display Form
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    this.clearInputs();
    form.style.display = 'none'; //to hide form
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000); //to hide the hidden class animation
  }

  clearInputs() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _toggleElevationField() {
    // this._clearInputs();
    inputElevation.closest('div').classList.toggle('form__row--hidden'); //Getting closest parent(div)
    inputCadence.closest('div').classList.toggle('form__row--hidden'); //toggle(), toggle between add and removed the pass class
  }

  _newWorkout(e) {
    //validate fields
    const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));

    //Check all positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //Prevent Event
    e.preventDefault();

    //Get data from Form
    const type = inputType.value;
    const distance = +inputDistance.value; // + convert String to number
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng; //const { lat: lati, lng: long } = mapEvent.latlng; {ObjectKey: ourVariable}
    let workout;
    //Check if data is validate

    //If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Please enter positive numbers!'); //If distance in number(-ve/+ve) then true

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Please enter positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to array
    this.#workouts.push(workout);

    //Render workout on map
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Hide from + Clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description} </h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>`;

    if (workout.type === 'running')
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`; //toFixed for once decimal place

    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>
    `; //toFixed for once decimal place

    form.insertAdjacentHTML('afterend', html); //After form tag end insert html created
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#zoomLevel, {
      animate: true,
      pan: { duration: 1 }, //Animation time
    }); //Leaf let settings

    //using public interface (workout get from find)
    // workout.click();
  }

  _renderWorkoutMarker(workout) {
    //Display marker
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          //Popup options
          maxWidth: 250,
          maxHeight: 100,
          autoClose: false,
          closeOnClick: false,
          className: `🏃‍♂️ ${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const workoutsData = JSON.parse(localStorage.getItem('workouts'));
    // console.log(workoutsData);
    if (!workoutsData) return;

    //Set workoutData to #workoutData
    this.#workouts = workoutsData;

    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  clearLocalStorage() {
    localStorage.clear(); //localStorage.removeItem('workouts')
    location.reload(); //to reload app
  }
}

//Create object of class to execute
const app = new App();
