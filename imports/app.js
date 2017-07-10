import React from 'react';
import { BrowserRouter, Route, Switch, NavLink } from 'react-router-dom';
import { Table } from '/imports/examples/reactiveTable';
import { LoginViaPhone } from '/imports/examples/loginViaPhone';

export const App = () => {
	return <div>
		<BrowserRouter>
			<div>
				<div className="navigation" style={{textAlign: 'center', marginBottom: '40px'}}>
					<NavLink to='/reactiveTable' style={{display: 'inline-block', width: '150px'}}>Reactive Table</NavLink>
					<NavLink to='/loginViaPhone' style={{display: 'inline-block', width: '150px'}}>Login Via Phone</NavLink>
				</div>
				<Switch>
					<Route exact path="/reactiveTable" component={Table}/>}/>
					<Route exact path="/loginViaPhone" component={LoginViaPhone}/>}/>
				</Switch>
			</div>
		</BrowserRouter>
	</div>;
};
