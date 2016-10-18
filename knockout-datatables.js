ko.bindingHandlers.datatable = { 
	init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {

		//KO doesn't have this inbuilt so copied from a knockout contributers suggestion https://github.com/knockout/knockout/pull/706
		function isObservableArray(value) { return ko.isObservable(value) && 'push' in value; }

		var options = ko.toJS(valueAccessor());

		//datatables errors aren't very descriptive, so I'll help where I can
		if (!isObservableArray(valueAccessor().data)) throw "Knockout-Datatables requires the input to be a Knockout observableArray"
		if (!options.uniqueKey) throw "Knockout-Datatables requires the uniqueKey input that accesses a unique peoperty in each object";
		if (!options.data) throw "Knockout-Datatables requires a datasource."; 
		if (options.ajax) throw "Knockout-Datatables does not handle ajax. Please retreive and persist data externally.";

		$(element).empty(); //datatables will build the table dynamically

		var uniqueKey = options.uniqueKey, keyToVMMap = { }; 
		options.columns.unshift({ data: uniqueKey, visible: false });//add a hidden column to find the row using the uniqueKey

		valueAccessor().data().forEach(function(data) {
			keyToVMMap[ko.toJS(data[uniqueKey])] = data;//store VM's to access once rows are created;
		});

		var createdRow = options.createdRow;//store user inputted function to replace with our own function
		function rebindChildren(row, data, index) {
			var vm = keyToVMMap[data[uniqueKey]];
			ko.applyBindingsToDescendants(bindingContext.createChildContext(vm), row);
			//TODO: maybe delete vm once it is bound to row -- save some space?

			if (createdRow) createdRow(row, data, index); //call user inputted function
		}
		options.createdRow = rebindChildren;

		var dtAPI = $(element).DataTable(options);

		var dataAdded = function(data) { 
			keyToVMMap[ko.toJS(data[uniqueKey])] = data;
			dtAPI.row.add(ko.toJS(data)).draw(); 
		};
		var dataRemoved = function(data) { 
			var key = ko.toJS(data)[uniqueKey];
			var rowIndex = dtAPI.column(0).data().indexOf(ko.toJS(data)[uniqueKey]);  

			//if a datatable is re-sorted rowLoop is assigned the new index and the index stays the same
			dtAPI.rows().every(function(index, tableLoop, rowLoop) {
				if (rowIndex == rowLoop) dtAPI.row(index).remove().draw();
			});
		};

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

		return { controlsDescendantBindings: true };
	}
}