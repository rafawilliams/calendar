dayjs.extend(window.dayjs_plugin_customParseFormat);

var calendar = {
    template: '<div id="calendar"></div>',
};

var app = new Vue({
    el: "#app",
    data: {
        form: {
            start_date: '',
            days_number: '',
            country_code: ''
        },
        errors: {
            start_date: '',
            days_number: '',
            country_code: ''
        },
        holidays: {},
        loading: false
    },
    mounted: function() {
        var self = this;
        $('#date1').datepicker({
            dateFormat: 'mm/dd/yy',
            changeMonth: true,
            changeYear: true,
            onSelect: function(date) {
                self.form.start_date = date;
                self.errors.start_date = '';
            }
        });
    },
    destroyed: function() {
        $("#date1").datepicker('destroy');
    },
    components: {
        'calendar': calendar
    },
    methods: {
        validate: function() {
            var valid = true;
            this.errors = { start_date: '', days_number: '', country_code: '' };

            var parsedDate = dayjs(this.form.start_date, 'MM/DD/YYYY', true);
            if (!this.form.start_date) {
                this.errors.start_date = 'Start date is required.';
                valid = false;
            } else if (!parsedDate.isValid()) {
                this.errors.start_date = 'Enter a valid date (mm/dd/yyyy).';
                valid = false;
            }

            var days = parseInt(this.form.days_number, 10);
            if (!this.form.days_number) {
                this.errors.days_number = 'Number of days is required.';
                valid = false;
            } else if (isNaN(days) || days < 1) {
                this.errors.days_number = 'Enter a number of days greater than 0.';
                valid = false;
            }

            var code = this.form.country_code.trim().toUpperCase();
            if (!code) {
                this.errors.country_code = 'Country code is required.';
                valid = false;
            } else if (!/^[A-Z]{2}$/.test(code)) {
                this.errors.country_code = 'Enter a valid 2-letter country code (e.g. US, MX).';
                valid = false;
            }

            return valid;
        },

        submit: function() {
            if (!this.validate()) return;

            var self = this;
            this.loading = true;
            $("#calendar").datepicker('destroy');

            var startDate   = dayjs(this.form.start_date, 'MM/DD/YYYY');
            var endDate     = startDate.add(parseInt(this.form.days_number, 10) - 1, 'day');
            var minDay      = this.form.start_date;
            var maxDate     = endDate.format('MM/DD/YYYY');
            var numMonths   = endDate.diff(startDate, 'month') + 2;
            var startYear   = startDate.year();
            var endYear     = endDate.year();
            var code        = this.form.country_code.trim().toUpperCase();

            // Soporte multi-año: llamadas paralelas si el rango cruza el cambio de año
            var requests = [axios.post('/holiday', { country_code: code, year: startYear })];
            if (endYear !== startYear) {
                requests.push(axios.post('/holiday', { country_code: code, year: endYear }));
            }

            Promise.all(requests).then(function(responses) {
                var merged = {};
                responses.forEach(function(res) {
                    if (res.data.holidays) {
                        Object.assign(merged, res.data.holidays);
                    }
                    if (res.data.status === '400') {
                        throw new Error(res.data.error);
                    }
                });

                self.holidays = merged;

                $("#calendar").datepicker({
                    defaultDate: minDay,
                    beforeShowDay: self.setHolidays,
                    dateFormat: 'mm/dd/yy',
                    minDate: minDay,
                    maxDate: maxDate,
                    numberOfMonths: numMonths
                });

            }).catch(function(err) {
                var msg = err.response && err.response.data && err.response.data.error
                    ? err.response.data.error
                    : err.message || 'Unexpected error. Please try again.';
                alert(msg);
            }).finally(function() {
                self.loading = false;
            });
        },

        setHolidays: function(date) {
            var fecha = dayjs(date).format('YYYY-MM-DD');
            if (Object.prototype.hasOwnProperty.call(this.holidays, fecha)) {
                return [true, "special", this.holidays[fecha][0].name];
            }
            return [true, ""];
        }
    }
});
