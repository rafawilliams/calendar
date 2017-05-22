 var calendar = {
     template: '<div id="calendar" class="container"></div>',
     data: function() {
         return {
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
         holidays:{}
     },
     mounted:function(){
         var self = this;
        $('#date1').datepicker({
            dateFormat:'mm/dd/yy',
            changeMonth: true,
            changeYear: true,
            onSelect: function(date) {
                self.form.start_date = date;
            }
        });

     },
     destroyed:function(){
          $("#date1").datepicker('destroy');
     },
     components: {
         'calendar': calendar
     },
     methods: {
         submit: function() {

            var self = this;
             $("#calendar").datepicker('destroy');

             var actualObjDate = moment(this.form.start_date, 'MM/DD/YYYY');
             var minDay = this.form.start_date;
             var furuteObjDate = actualObjDate.clone().add((this.form.days_number -1),'d') ;
             var maxDate = furuteObjDate.format('MM/DD/YYYY');

             var month1 = parseInt(minDay.split('/')[0]);
             var month2 = parseInt(maxDate.split('/')[0]);
             
             var numberOfMonths = furuteObjDate.diff(actualObjDate,'months') + 1
           
            console.log(numberOfMonths);
             axios.post('/holyday', {
                 country_code: this.form.country_code,
                 year: actualObjDate.year()
             }).then(function(response){

                 self.holidays = response.data.holidays;

                 $("#calendar").datepicker({
                    defaultDate: minDay,
                    beforeShowDay: self.setHolydays,
                    duration: "slow",
                    dateFormat:'mm/dd/yy',
                    minDate: minDay,
                    maxDate: maxDate,
                    numberOfMonths:numberOfMonths
                });

             });

         },
         setHolydays:function(date){
             
             var fecha = moment(date).format('YYYY-MM-DD');
           
            if (this.holidays.hasOwnProperty(fecha)) {
                
                var holy = this.holidays[fecha][0];
            
                return [true,"special",holy.name];
            } else {
                return [true, ""];
            }
         }
     }

 });