 var calendar = {
     template: '<div id="calendar">hoy</div>',

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
             var self = this;
             var date = moment(this.form.start_date, 'MM/DD/YYYY');
             $("#calendar").datepicker("destroy");
             $("#calendar").datepicker("setDate", this.form.start_date);
             this.$nextTick(function() {
                 $("#calendar").datepicker({
                     dateFormat: 'mm/dd/yy',
                     minDate: date.toString(),
                     maxDate: "+" + self.form.days_number + "d",
                     numberOfMonths: 2,
                 });
             });

             /*axios.post('/holyday', {
                 country_code: this.form.country_code,
                 year: date.year()
             })*/

         }
     }

 });