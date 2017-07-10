/**
* @author Amit
* @maintainers Amit
* @since Apr 6, 2017
*/

import React from 'react';
import { Meteor } from 'meteor/meteor';
require('/imports/methods/otp');

export class LoginViaPhone extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {otpSentOn: false, showResendOtpButton: false, loggedInUserId: Meteor.userId()};
	}
	otpPurpose = 'login';
	handleLoginForSubmit(evt) {
		evt.preventDefault();

		let self = this;
		if (this.phoneElement.value) {
			if (!this.otpElement.value) { console.error('Please enter the otp.'); return; } // eslint-disable-line no-console
			Meteor.loginWithPhone({phone: this.phoneElement.value, otp: this.otpElement.value}, function(err) {
				if (err) console.error(err.reason, err); // eslint-disable-line no-console
				console.log('Logged In!'); // eslint-disable-line no-console
				self.setState({loggedInUserId: Meteor.userId()});
			});
		}
	}
	handleSendOtp() {
		let self = this;
		let phone = this.phoneElement.value;
		if (!phone) console.error('Please enter valid Indian number.'); // eslint-disable-line no-console
		Meteor.call('otp.create', {phone, purpose: this.otpPurpose}, function(e) {
			if (e) console.error('Could not send otp. Please contact support@settlin.in', e); //eslint-disable-line no-console
			else {
				self.setState({otpSentOn: phone});
				self.setState({showResendOtpButton: true});
				console.info('Sent the otp on ' + phone); // eslint-disable-line no-console
			}
		});
	}
	handleOtpChange(evt) {
		// show the resend button only when the input is blank
		this.setState({showSubmitButton: evt.target.value.length === 5});
	}
	handleMobileChange(evt) {
		if (evt.target.value.length > 10) evt.target.value = evt.target.value.substr(0, 10);
		this.setState({showOtpInput: evt.target.value.length === 10});
	}
	render() {
		return (
			<div style={{margin: '0 auto', maxWidth: '200px', textAlign: 'center'}} id='login-div'>
				{Boolean(this.state.loggedInUserId) ?
					<div>
						<div>Logged in user id: {this.state.loggedInUserId}</div>
						<button onClick={() => Meteor.logout(() => this.setState({loggedInUserId: null}))}>Logout</button>
					</div>
					:
					<form id='login-form' onSubmit={this.handleLoginForSubmit.bind(this)}>
						<div>
							<div style={{marginBottom: '10px'}}>
								<input style={{marginBottom: '10px', width: '200px'}} name='phone' placeholder='Mobile' type='number' onChange={this.handleMobileChange.bind(this)} ref={(el) => {this.phoneElement = el;}}/>
								{this.state.showOtpInput && <div>
									<a style={{width: '80px', margin: '0 15px', textDecoration: 'underline', cursor: 'pointer'}} onClick={this.handleSendOtp.bind(this)}>{this.state.showResendOtpButton ? 'Resend' : 'Send'} OTP</a>
									<input style={{width: '80px'}} name='otp' type='number' placeholder='OTP' onChange={this.handleOtpChange.bind(this)} ref={(el) => {this.otpElement = el;}}/>
								</div>}
    					</div>
							{this.state.showSubmitButton && <div style={{marginBottom: '10px'}}>
								<button type='submit'>Submit</button>
							</div>}
						</div>
					</form>
				}
			</div>
		);
	}
}
