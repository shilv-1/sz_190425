// 1. 执行器业务逻辑中定义的 在库中调用
// 2. 执行器中的两个函数参数是在库中定义的 在业务逻辑中调用的
// 3. then方法的两个回调也是在业务逻辑中定义的 在库中调用

(function (window) {
    var PENDING = "pending";
    var RESOLVED="resolved";
    var REJECTED = "rejected";

    // new Promise的这个实例 他的状态有可能是同步确定的 也有可能是异步确定的
    function Promise(executor) {
        //调用执行器参数时 如何确定返回的promise实例(new Promise)的状态
        var that = this;
        this.status = PENDING;
        this.data = undefined;
        this.callBacks = []; // [{onResolved:onResolved,onRejected:onRejected},{}....]

        function resolve(val){
            if(that.status !== "pending"){
                return;
            }

            that.status = RESOLVED;
            that.data = val;
            that.callBacks.forEach(function (item) {
                setTimeout(function () {
                    item.onResolved()
                },0)
            })
        }
        function reject(reason){
            if(that.status !== "pending"){
                return;
            }

            that.status = REJECTED;
            that.data = reason;
            that.callBacks.forEach(function (item) {
                setTimeout(function () {
                    item.onRejected()
                },0)
            })
        }

        try {
            executor(resolve,reject)
        }catch (e) {
            reject(e)
        }
    }


    /*
        then方法的两个回调参数应该如何处理
            两个回调参数必定有一个要被放入微队列
                --- 状态确定
                    状态确定 应该立马放微队列
                    状态没确定 先存起来 等状态确定了再放入微队列
                --- then方法被调用
        then方法的返回值是什么
            then方法的返回值必定是一个promise
       */
    Promise.prototype.then=function(onResolved,onRejected){
        var that = this;
        if(typeof onResolved !== "function"){
            onResolved = function (val) {
                return val;
            }
        }
        if(typeof onRejected !== "function"){
            onRejected = function(reason){
                throw new Error(reason)
            }
        }
        return new Promise(function (resolve,reject) {
            //只要是放入微队列中的回调 都会执行handleResult
            //handleResult中的callback就是那个对应回调!!!!
            function handleResult(callback) {
                try {
                    var result = callback(that.data)
                    if(result instanceof Promise){
                        //返回的值是promise
                        result.then(function (val) {
                            resolve(val)
                        },function (reason) {
                            reject(reason)
                        })
                    }else{
                        resolve(result)
                    }
                }catch (e) {
                    reject(e)
                }
            }

            if(that.status === PENDING){
                that.callBacks.push({
                    onResolved:function () {
                        handleResult(onResolved)
                    },
                    onRejected:function () {
                        handleResult(onRejected)
                    }
                })
            }else if(that.status === RESOLVED){
                setTimeout(function () {
                    handleResult(onResolved)
                })
            }else  if (that.status === REJECTED){
                setTimeout(function () {
                    handleResult(onRejected)
                })
            }
        })
    }

    /*
        promise 错误穿透
        promise 链终止
    */
    Promise.prototype.catch = function(onRejected){
        return this.then(null,onRejected)
    }

    Promise.resolve = function(val){
        return new Promise(function (resolve,reject) {
            if(val instanceof Promise){
                // val.then(function (val) {
                //     resolve(val)
                // },function (reason) {
                //     reject(reason)
                // })
                val.then(resolve,reject)
            }else {
                resolve(val)
            }
        })
    }

    Promise.reject = function(val){
        return new Promise(function (resolve,reject) {
            reject(val)
        })
    }

    Promise.race=function(promiseArr){
        return new Promise(function (resolve,reject) {
            promiseArr.forEach(function (item) {
                item.then(function (val) {
                    resolve(val)
                },function (err) {
                    reject(err)
                })
            })
        })
    }

    Promise.all = function(promiseArr){
        var flag = 0;
        var resolveArr =[];
        return new Promise(function (resolve,reject) {
            promiseArr.forEach(function (item,index) {
                item.then(function (val) {
                    flag++;
                    resolveArr[index]=val;
                    if(flag === promiseArr.length){
                        resolve(resolveArr)
                    }
                },function (reason) {
                    reject(reason)
                })
            })
        })
    }

    window.Promise = Promise;
})(window)