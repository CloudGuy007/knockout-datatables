ko.bindingHandlers.datatable = { 
	init: function (element, valueAccessor) {
		var options = ko.toJS(valueAccessor()); //convert observables to plain objects

		$(element).empty(); //datatables will build the table dynamically

		//datatables errors aren't very descriptive, so I'll help where I can
		if (!options.uniqueKey) throw "Knockout-Datatables requires the uniqueKey input that accesses a unique peoperty in each object";
		if (!options.data) throw "Knockout-Datatables requires a datasource."; 
		if (options.ajax) throw "Knockout-Datatables does not handle ajax. Please retreive and persist data externally.";

		var uniqueKey = options.uniqueKey;
		options.columns.unshift({ data: uniqueKey, visible: false });//add a hidden column to find the row using the uniqueKey

		var dtAPI = $(element).DataTable(options);

		var dataAdded = function(data) { dtAPI.row.add(ko.toJS(data)).draw(); };
		var dataRemoved = function(data) { 
			var key = ko.toJS(data)[uniqueKey];
			var rowIndex = dtAPI.column(0).data().indexOf(ko.toJS(data)[uniqueKey]);  

			//if a datatable is re-sorted rowLoop is assigned the new index and the index stays the same
			dtAPI.rows().every(function(index, tableLoop, rowLoop) {
				if (rowIndex == rowLoop) dtAPI.row(index).remove().draw();
			});
		}

		var oldData;
		var fnBeforeChange = function(dataBeforeChange) { oldData = dataBeforeChange.slice(0);  };//deep copy to prevent updating oldData
		var fnAfterChange = function(dataAfterChange) { 
			var differences = ko.utils.compareArrays(oldData, dataAfterChange);
			differences.forEach(function(difference) {
				if (difference.status === 'added') dataAdded(difference.value);
				if (difference.status === 'deleted') dataRemoved(difference.value);
			});
		};

		valueAccessor().data.subscribe(fnBeforeChange, null, 'beforeChange');
		valueAccessor().data.subscribe(fnAfterChange);
	}
}