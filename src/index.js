import React from 'react';
import ReactDOM from 'react-dom';
import * as Redux from 'redux';
import * as ReactRedux from 'react-redux';
import * as ReduxSaga from 'redux-saga'
import * as Reactstrap from 'reactstrap'
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';

const { combineReducers, applyMiddleware, createStore } = Redux;
const createSagaMiddleware = ReduxSaga.default;
const { put, call } = ReduxSaga.effects;
const { takeEvery } = ReduxSaga;
const { connect, Provider } = ReactRedux;
const axios = require('axios');
const {
  Container,
  Button,
  Card,
  CardBlock,
  CardTitle
} = Reactstrap;

// Actions go here
const getCurrentLoc = () => ({
  type: 'GET_CURRENT_LOCATION_REQUESTED'
});

const getWeatherInfo = (lat, lon) => ({
  type: 'GET_WEATHER_INFO_REQUESTED',
  payload: {
    lat,
    lon
  }
})

// Sagas go here

function* getCurrentLocSaga() {
  try {
    const result = yield call(getCurrentLocAPI);
    const geoValues = result.loc.split(',');
    const location = {
      city: result.city,
      country: result.country,
      lat: geoValues[0],
      lon: geoValues[1],
    }
    yield put({type: 'GET_CURRENT_LOCATION_SUCCESS', payload: location});
  } catch(error) {
    yield put({type: 'GET_CURRENT_LOCATION_FAILURE'});
  }
}

function* getWeatherInfoSaga({payload}) {
  try {
    const result = yield call(getWeatherInfoAPI, payload);
    
    const weather = {
      id: result.weather[0].id,
      status: result.weather[0].main,
      temp: result.main.temp,
      windSpeed: result.wind.speed,
    }
    
    yield put({type: 'GET_WEATHER_INFO_SUCCESS', payload: weather});
  } catch(err) {
    yield put({type: 'GET_WEATHER_INFO_FAILURE'});
  }
}

function* rootSaga() {
  yield [
    yield takeEvery('GET_CURRENT_LOCATION_REQUESTED', getCurrentLocSaga),
    yield takeEvery('GET_WEATHER_INFO_REQUESTED', getWeatherInfoSaga)
  ]
}

// APIs go here
const getCurrentLocAPI = () => axios.get('https://ipinfo.io', {
      headers: {
        'Accept': 'application/json'
      }
    }).then(response => response.data)
    .catch(err => {
      throw err;
    });

const getWeatherInfoAPI = ({lat, lon}) => {
  const baseUrl = 'http://api.openweathermap.org/data/2.5/weather?';
  const latParams = 'lat=' + lat;
  const lonParams = '&lon=' + lon;
  const unitParams = '&units=metric';
  const appIdParams = '&appid=cda95ddeb17adb2fc338e7fe7c132ab2';
  
  const fullUrl = baseUrl + latParams + lonParams + unitParams
       + appIdParams;
  
  return axios.get(fullUrl, {
        headers: {
          'Accept': 'application/json'
        }
      }).then(res => res.data)
      .catch(error => {
    throw error
  });
}

// Reducers go here
const locationReducer = (state={}, action) => {
  switch(action.type) {
    case 'GET_CURRENT_LOCATION_REQUESTED':
      return {loading: true};
    case 'GET_CURRENT_LOCATION_SUCCESS':
      return {
        loading: false,
        ...action.payload
      }
    case 'GET_CURRENT_LOCATION_FAILURE':
      return {loading: false};
    default:
      return state;
  }
}

const weatherReducer = (state={}, action) => {
  switch(action.type) {
    case 'GET_WEATHER_INFO_REQUESTED':
      return {
        loading: true,
      }
    case 'GET_WEATHER_INFO_SUCCESS':
      return {
        loading: false,
        ...action.payload
      }
    case 'GET_WEATHER_INFO_FAILURE':
      return {
        loading: false,
      }
    default:
      return state;
  }
}

const rootReducer = combineReducers({location: locationReducer, weather: weatherReducer});

// Store goes here
const sagaMiddleware = createSagaMiddleware();
const store = createStore(rootReducer, applyMiddleware(sagaMiddleware));
sagaMiddleware.run(rootSaga);


// Main component goes here
const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '30px',
}

const linkStyle = {
  color: '#009688'
}

class Weather extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      isCelcius: true,
    }
    
    this.toggleDegreeType = this.toggleDegreeType.bind(this);
  }
  componentDidMount() {
    this.props.getCurrentLoc();
  }
  shouldComponentUpdate(nextProps, nextState) {
    if(this.props.location !== nextProps.location 
       || this.props.weather !== nextProps.weather
      || this.state.isCelcius !== nextState.isCelcius) {
      return true;
    }
    
    return false;
  }
  componentDidUpdate(prevProps, prevState) {
    if(this.props.location !== prevProps.location) {
      const {lat, lon} = this.props.location;
      if(lat && lon) {
        this.props.getWeatherInfo(lat, lon);
      }
    }
  }
  toggleDegreeType() {
    this.setState({
      isCelcius: !this.state.isCelcius
    })
  }
  renderTemp() {
    const {temp} = this.props.weather;
    return this.state.isCelcius ? temp : (temp*9/5 + 32); 
  }
  genIcon() {
    const {id} = this.props.weather;
    return (
      <i className={`wi wi-owm-${id}`}></i>
    )
  }
  render() {
    console.log('Rerendering...');
    const {location, weather} = this.props;
    const {city, country, lat, lon} = location;
    const {id, status, temp, windSpeed} = weather;
    if(location.loading || weather.loading) {
      return (
        <div className="spinner">
          <div className="bounce1"></div>
          <div className="bounce2"></div>
          <div className="bounce3"></div>
        </div>
      )
    } else {
      return (
        <Container fluid>
        <Card>
          <CardBlock style={cardStyle}>
            {city && country && <CardTitle>{city}, {country}</CardTitle>}
            {status && temp && <CardTitle>
              {status} {this.genIcon()}
            </CardTitle>}
            {windSpeed && <CardTitle>
                {this.renderTemp()}<a href="#" style={linkStyle} onClick={this.toggleDegreeType}>&#176;{this.state.isCelcius ? 'C' : 'F'}</a>, {windSpeed} m/s
            </CardTitle>}
          </CardBlock>
        </Card>
      </Container>  
      )
    }
  }
}

const mapStateToProps = (state) => ({
  location: state.location,
  weather: state.weather,
})

const mapDispatchToProps = (dispatch) => ({ 
  getCurrentLoc: () => dispatch(getCurrentLoc()),
  getWeatherInfo: (lat, lon) => dispatch(getWeatherInfo(lat, lon))
})  // wrap action creator with dispatch method

const WeatherPage = connect(mapStateToProps, mapDispatchToProps)(Weather);

ReactDOM.render(
  <Provider store={store}>
    <WeatherPage />
  </Provider>,
  document.getElementById('root')
);