(function(){

    /*
     * How to reference:
     *
     * .onReady > this.currentVideo = new videoPlayer( _V_('video-container'),{options: 'go_here'} );
     *
     * var bb = new videoPlayer(_V_('video-container'), [{src: 'http://localhost:3501/videos/projects/0/assets/DSC_0151_1.mp4',length: 6}, {src: 'http://localhost:3501/videos/projects/0/assets/DSC_0152_1.mp4',length: 5} ]);
     */

    window.videoPlayer = (function(videoObj, options){

        this.options = {
            clips: []
        };
        this.video_object = {};
        this.currentlyPlayedClip = 0;
        this.currentlyTime = 0;
        this.totalLength = 0;
        this.initialized = false;

        /*
         * Initializer, happens then the object is being created
         */
        this.initializer = (function(videoObj, options){

            if( _.isArray(options) ) {

                this.addClips(options);

            } else {

                _.extend(this.options, options);

            }

            this.appendVideo(videoObj);
            this.setup(options);
            this.calculateStartingPoints();

            return this;
        });

        /*
         * Append VideoJS object;
         */
        this.appendVideo = function(videoObj){
            this.video_object = videoObj;

            return this;
        };

        /*
         * Play the video Object
         */
        this.play = function(){
            // PLay from...
            // this.video_object.currentTime( this.currentlyTime );
            this.video_object.play();

            return this;
        };

        /*
         * Pause the video Object
         */
        this.pause = function(){
            this.video_object.pause();

            return this;
        };

        /*
         * Toggle playback
         */
        this.toggle = function(){
            if (this.paused()) {
                this.play();
            } else {
                this.pause();
            }

            return this;
        };

        /*
         * Check if paused
         */
        this.paused = function(){
            return this.video_object.paused();
        };

        /*
         * Get the current clip, if a number is passed in, set the video
         */
        this.currentClip = function(clip_id, callback) {

            var clip = undefined;

            if (typeof clip_id === 'number') {

                this.setClipSource(clip_id, callback);

                clip = this.options.clips[this.currentlyPlayedClip];

            }else{
                clip = this.options.clips[this.currentlyPlayedClip];
            }

            return clip;

        };

        /*
         * Get or Set a time of reel
         */
        this.currentTime = function(time){

            if (typeof time === 'number') {

                // Set the time if the number is passed in
                var that = this;
                var obj = this.timeToClip(time);

                if (obj){

                    var clip_time = time - obj.reelFrom;

                    this.currentClip( this.timeToClipIndex(time), function(){

                        var callback_called = false;

                        // Load current time when the meta data is being loaded
                        that.video_object.addEvent("loadedmetadata", function(){

                            if (callback_called) return

                            that.video_object.currentTime(clip_time);
                            callback_called = true;
                        });

                    });

                }
                return time;
            }else{
                // Else return the current time
                return parseFloat( this.getCurrentClip().reelFrom + this.video_object.currentTime() );
            }
        };

        /*
         * Retrieve object of the currently played clip
         */
        this.getCurrentClip = function(){
            return this.options.clips[ this.currentlyPlayedClip ];
        };

        /*
         * Retrieve object of the next clip
         */
        this.getNextClip = function() {

            return this.options.clips[ this.currentlyPlayedClip + 1 ];
        };

        /*
         * Retrieve object of the previous clip
         */
        this.getPreviousClip = function() {

            return this.options.clips[ this.currentlyPlayedClip - 1 ];
        };

        /*
         * Load the next Clip
         */
        this.loadNextClip = function(){

            return this.currentClip(this.currentlyPlayedClip + 1);
        };

        /*
         * Load previous Clip
         */
        this.loadPreviousClip = function(){

            return this.currentClip(this.currentlyPlayedClip - 1);
        };

        /*
         * Add a new clip and update data
         */
        this.addClip = function(item, index){

            if(typeof index === 'number'){

                this.injectAfter(index, item);
                this.totalLength += item.length;

            }else{
                // Add to the array
                this.options.clips.push(item);
                this.totalLength += item.length;
            }

            // Calculate video lengths
            this.calculateStartingPoints();

            return this;
        };

        /*
         * Add array of clips
         */
        this.addClips = function(items, callback){

            var that = this;

            _.each(items, function(element, index){
                that.addClip(element);
            });

            /*
             * Callback
             */
            if ( _.isFunction(callback) ) {
                callback(this);
            }

            return this;
        };

        /*
         * Remap clips, change index of given clip
         */
        this.remapClip = function(index, new_index){

            var clip = this.options.clips[index];
            var clip2 = this.options.clips[new_index];

            console.log(clip);
            console.log(clip2);

            this.options.clips[new_index] = clip;
            this.options.clips[index] = clip2;

            this.calculateStartingPoints();

            return this;
        };

        /*
         * Inject a new clip after given index
         */
        this.injectAfter = function(index, clip){

            this.options.clips.splice( (index + 1 ), 0, clip);

            return this;
        };

        /*
         * Inject a new clip before given index
         */
        this.injectBefore = function(index, clip){

            this.options.clips.splice( index , 0, clip);

            return this;
        };

        /*
         * Set the source for given clip
         */
        this.setClipSource = function(clip_id, callback){

                if (this.options.clips[clip_id]) {

                    this.currentlyPlayedClip = clip_id;
                    this.video_object.src({ type: "video/mp4", src: this.options.clips[clip_id].src });

                } else {

                    console.log('No such clip.');

                    this.currentlyPlayedClip = 0;
                    this.video_object.src({ type: "video/mp4", src: this.options.clips[0].src });
                }

            /*
             * Callback
             */
            if ( _.isFunction(callback) ) {
                callback(this);
            }

            return this;
        };

        /*
         * Get Total Duration of the reel
         */
        this.duration = function(){
            var duration = 0;

            _.each(this.options.clips, function(element, index){
                duration += element.length;
            });

            return duration;
        };

        /*
         * Calculate reel starting points
         */
        this.calculateStartingPoints = function(){

            var startingPoint = 0;
            var that = this;

            _.each(this.options.clips, function(element,index){

                /*
                 * Remove any not unnecessary elements
                 */
                if(element === undefined){
                    that.options.clips.splice(index, 1);
                    element = that.options.clips[index];
                }

                /*
                 * Calculate In and Length
                 */
                that.options.clips[index].reelFrom = startingPoint;
                startingPoint += element.length;
            });

            return this;
        };

        /*
         * Retrieves a clip object for a given time
         */
        this.timeToClip = function(time){

            var results = _.filter(this.options.clips, function(num){
                return (time >= num.reelFrom) && (time <= (num.reelFrom + num.length));
            });

            return results[0];
        };

        /*
         * Retrieve index of a clip for a given time
         */
        this.timeToClipIndex = function(time){

            var results = _.filter(this.options.clips, function(num){
                return (time >= num.reelFrom) && (time <= (num.reelFrom + num.length));
            });

            return _.indexOf(this.options.clips, results[0]);
        };

        /*
         * Initialize the video
         */
        this.setup = function(){

            var that = this;

            /*
             * Parse all clips, calculate length
             */
            _.each(this.options.clips, function(element, index){
                that.totalLength += element.length;
            });

            this.currentTime(0);

            /*
             * Propagate events
             */
            this.video_object.addEvent("ended", function(){

                that.loadNextClip();
                that.play();
            });

            this.video_object.addEvent('timeupdate', function(event){
                that.currentlyTime = that.currentTime();
            });

            this.video_object.load();

            this.initialized = true;

            return this;
        };

        /*
         * Run the initializer
         */
        return this.initializer(videoObj, options);
    });

})(window, _, _V_);