import React from 'react';
import { Provider } from 'react-redux';
import store from './store/store';
import LogInteractionScreen from './components/LogInteractionScreen';
import './App.css';

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <LogInteractionScreen />
      </div>
    </Provider>
  );
}

export default App;
