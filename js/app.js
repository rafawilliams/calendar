 var calendar = {
     template: '<div id="calendar">hoy</div>',
     mounted: function() {
         this.$on('onSetcalendar', this.renderCalendar);
     },
     data: function() {
         return {
             fecha: ''
         }
     },
     methods: {
         renderCalendar: function(form) {
             var date = moment(form.start_date, 'MM/DD/YYYY');
             var mesActual = date.month();
             this.fecha = date;
             console.log(date.add(form.days_number, 'days').month());
             var dateFormat = "mm/dd/yy";
             this.nextTick(function() {
                 $("#calendar").datepicker({
                     defaultDate: "+" + form.days_number,
                     minDate: "w",
                     maxDate: "+17" + form.days_number,
                     numberOfMonths: 2,
                     gotoCurrent: true,
                 });
             });
         }
     }
 };

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
     components: {
         'calendar': calendar
     },
     methods: {
         submit: function() {
             var date = moment(this.form.start_date, 'MM/DD/YYYY');
             this.$emit('onSetcalendar', this.form);
             $("#calendar").datepicker({
                 defaultDate: "+" + this.form.days_number,
                 minDate: "w",
                 maxDate: "+17" + this.form.days_number,
                 numberOfMonths: 2,
                 gotoCurrent: true,
             });
             /*axios.post('/holyday', {
                 country_code: this.form.country_code,
                 year: date.year()
             })*/

         }
     }

 });