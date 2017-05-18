Vue.component('calendar', {
    template: '<div id="calendar">hoy</div>',
    mounted: function() {
        this.$on('onSetcalendar', this.renderCalendar);
    },
    methods: {
        renderCalendar: function(form) {
            var date = moment(form.start_date, 'MM/DD/YYYY');
            var mesActual = date.month();
            console.log(date.add(form.days_number, 'days').month());
            var dateFormat = "mm/dd/yy";
            var from = $("#calendar")
                .datepicker({
                    defaultDate: "+" + form.days_number,
                    minDate: "w",
                    maxDate: "+17" + form.days_number,
                    numberOfMonths: 2,
                    gotoCurrent: true,
                });
        }
    }
});

var app = new Vue({
    el: "#app",
    data: {
        showcalendar: false,
        form: {
            start_date: '',
            days_number: '',
            country_code: ''
        },
    },
    methods: {
        submit: function() {
            var date = moment(this.form.start_date, 'MM/DD/YYYY');
            this.$emit('onSetcalendar', this.form);
            /*axios.post('/holyday', {
                country_code: this.form.country_code,
                year: date.year()
            })*/

        }
    }

});