Component({
    properties: {
        percent: Number,
        width: String,
        height: String,
    },
    data: {
        width: "200px",
        height: "200px",
    },
    observers: {
        // 'percent': function (current) {
        //     if (current >= 100) this.setData({
        //         percent: 0,
        //     })
        // },
    },
    lifetimes: {
        attached: function () {

        }
    },
    methods: {

    },
});
