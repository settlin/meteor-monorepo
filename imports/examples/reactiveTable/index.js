import { Mongo } from 'meteor/mongo';
import React from 'react';
import ReactTable from 'react-table';
import { ReactiveTable } from 'meteor/settlin:reactive-table';

import 'react-table/react-table.css';
const Individuals = new Mongo.Collection('individuals');

class Table extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = { rowsPerPage: 10, page: 1, sort: {}, filters: {}, data: [], pages: 0, loading: false };
	}
	onPageChange(page) { this.setState({page: page + 1}); }
	onPageSizeChange(pageSize) { this.setState({rowsPerPage: pageSize}); }
	onSortedChange(sorted) {
		let sort = {};
		(sorted || []).map((s) => { sort[s.id] = s.desc ? -1 : 1; });
		this.setState({sort});
	}
	setData({data, pages, loading}) {
		this.setState({data, pages, loading});
	}
	shouldComponentUpdate(np, ns) {
		let cs = this.state;
		for (var s in ns) if (ns.hasOwnProperty(s) && JSON.stringify(ns) !== JSON.stringify(cs)) return true;
		return false;
	}
	render() {
		const columns = [
			{Header: 'Name', accessor: 'name'},
			{Header: 'Type', accessor: 'type'},
			{Header: 'Identifier', accessor: 'identifier'},
			{Header: 'Mobiles', id: 'phones.value', accessor(o) {
				if (!o.phones) return '--';
				return <div>{o.phones.map(p => <div key={p.value}><b>{p.type}</b>: {p.value}</div>)}</div>;
			}},
			{Header: 'Emails', id: 'emails.value', accessor(o) {
				if (!o.emails) return '--';
				return <div>{o.emails.map(p => <div key={p.value}><b>{p.type}</b>: {p.value}</div>)}</div>;
			}},
		];

		let {sort, page, rowsPerPage, filters, data, pages} = this.state;
		return (
			<div>
				<input type='text' onChange={() => this.setState({filters: {type: 'agent'}})}/>
				<ReactiveTable.Component publication='test' collection={Individuals} sort={sort} page={page} rowsPerPage={rowsPerPage} filters={filters} onDataChange={this.setData.bind(this)} className='table-wrap'>
					<ReactTable
						className="-striped -highlight"
						columns={columns}
						defaultPageSize={10}
						onPageChange={this.onPageChange.bind(this)}
						onPageSizeChange={this.onPageSizeChange.bind(this)}
						onSortedChange={this.onSortedChange.bind(this)}
						manual
						data={data} pages={pages}
					/>
				</ReactiveTable.Component>
			</div>
    );
	}
}

export { Table };
