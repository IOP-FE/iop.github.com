/**
 * @file 标签输入控件
 * @author yuyouwen@baidu.com
 *
 * @description
 * TagChoose 构造函数
 *
 *  separator 分割符号
 *  tags 存放标签的object
 *
 *  initStructure() 初始化控件的DOM结构
 *  initEvents() 初始化组件的事件交互
 *
 *  add(value) 添加标签
 *  remove(value) 删除标签
 *  getRawValue() 获取控件值
 *  setValue() 继承自InputControl,设置控件的值
 *  getValue() 继承自InputControl,获取控件的值
 *
 *  input 输入框
 *  getInputValue() 获得输入框的值
 *  setInputValue(value) 设置输入框的值
 */

define('TagChoose', 
    function (require) {
        var u = require('underscore');
        var lib = require('esui/lib');
        var paint = require('esui/painters');
        var InputControl = require('esui/InputControl');

        /**
         * 标签输入控件
         *
         * @extends InputControl
         * @param {Object} [options] 初始化参数
         * @constructor
         */
        function TagChoose(options) {
            InputControl.apply(this, arguments);
        }

        TagChoose.prototype = {
            /**
             * 控件类型
             *
             * @type {string}
             * @readonly
             * @override
             */
            type: 'TagChoose',

            /**
             * 初始化参数配置
             *
             * @param {Object} options 配置的参数
             * @param {string|number=} option.width 控件长度，可选参数
             * @param {string|number=} option.inputWidth 输入框长度，可选参数
             * @param {string|number=} option.minLength 标签最小长度，可选参数
             * @param {string|number=} option.limit 标签个数，可选参数
             * @param {string=} option.separator 分隔符，可选参数，不选会使用逗号
             * @protected
             */
            initOptions: function (options) {
                var properties = {
                    // 默认宽度
                    width: 500,
                    // 输入框的宽度
                    inputWidth: 100,
                    // 标签最小长度
                    minLength: 0,
                    // 标签个数
                    limit: 0,
                    // 默认分隔符
                    separator: ',',
                    // 用于存放标签
                    tags: {}
                };
                lib.extend(properties, options);
                // 参数转换成number类型
                properties.width = parseInt(properties.width, 10);
                properties.inputWidth = parseInt(properties.inputWidth, 10);
                properties.minLength = parseInt(properties.minLength, 10);
                properties.limit = parseInt(properties.limit, 10);
                this.setProperties(properties);
            },

            /**
             * 初始化文档结构
             *
             * @protected
             */
            initStructure: function () {
                // 如果用的是一个`<input>`，替换成`<div>`
                if (this.main.nodeName.toLowerCase() === 'input') {
                    this.helper.replaceMain();
                    this.main.id = this.helper.getId();
                }
                // 构造输入框，获取ID并将控件的属性添加到input上
                var inputId = this.helper.getId('input');

                this.main.innerHTML = '<input type="text" class="tag-choose-input" id="' + inputId + '"/>';

                this.input = document.getElementById(inputId);
            },

            /**
             * 初始化事件交互
             *
             * @protected
             * @override
             */
            initEvents: function () {
                var controlHelper = this.helper;
                // 给控件绑定点击事件，将标签的删除按钮事件也放在这里处理
                controlHelper.addDOMEvent(
                    this.main,
                    'click',
                    function (e) {
                        var target = lib.event.getTarget(e);
                        if (target === this.input || target === this.main) {
                            this.focus();
                        }
                        else if (lib.hasClass(target, 'close')) {
                            this.removeTag(target.parentNode);
                        }
                    });
                // 将输入框的失去焦点事件绑定到控件上
                controlHelper.addDOMEvent(this.input, 'blur', function () {
                    this.blur();
                });
                // 将输入框的键盘弹起操作绑定到处理函数上
                controlHelper.addDOMEvent(this.input, 'keyup', dispatchSpecialKey);
            },

            /**
             * 获得焦点事件，给组件添加边框高亮样式并同时应用到输入框
             */
            focus: function () {
                this.addState('focused');
                this.input.focus();
            },

            /**
             * 失去焦点，移除边框高亮样式
             */
            blur: function () {
                this.input.blur();
                this.removeState('focused');
            },

            /**
             * 获得输入框的值，写个方法获取，就不用每次写一长串影响美观的东西了
             *
             * @return {string} 输入值
             */
            getInputValue: function () {
                return this.input.value;
            },

            /**
             * 设置输入框的值
             *
             * @param {string} value 输入的值
             */
            setInputValue: function (value) {
                this.input.value = value;
            },

            /**
             * 设置组件的值
             *
             * @param {string} value 值
             */
            setTagValue: function (value) {
                var items = this.main.getElementsByTagName('div');
                for (var i = items.length - 1; i >= 0; i--) {
                    items[i].parentNode.removeChild(items[i]);
                }

                this.tags = {};
                this.add(value);
            },

            /**
             * 预处理标签
             *
             * @param  {Array} tagArray 预处理传过来的参数
             */
            createTags: function (tagArray) {
                if (!tagArray) {
                    return;
                }
                for (var i = 0; i < tagArray.length; i++) {
                    var currentTag = tagArray[i];
                    if (/^\s*$/.test(currentTag)) {
                        continue;
                    }
                    if (this.limit && u.size(this.tags) >= this.limit) {
                        break;
                    }
                    if (currentTag.length < this.minLength) {
                        continue;
                    }
                    var repeatTagId = this.getTagId(currentTag);
                    if (repeatTagId) {
                        this.showRepeat(repeatTagId);
                        continue;
                    }
                    this.addTagToDom(currentTag);
                }
            },

            /**
             * 将Tag添加到DOM中，并保存到tags中
             *
             * @param {sting} token 需要添加的标签值
             */
            addTagToDom: function (token) {
                // 构造并插入到dom中
                var itemClass = this.helper.getPartClassName('item');
                var tagElem = document.createElement('div');
                lib.addClass(tagElem, itemClass);
                tagElem.innerHTML = '<span class="label">' + u.escape(token) + '</span>'
                    + '<span class="close">&times;</span>';
                // 获取ID
                var guid = lib.getGUID();
                // 设置属性值并插入到input前面
                lib.setAttribute(tagElem, 'data-id', guid);
                lib.insertBefore(tagElem, this.input);
                // 将数据存储到tags中
                this.tags[guid] = token;
            },

            /**
             * 根据值查询已添加的Tag的ID值
             *
             * @param  {string} inputValue 查询的值
             * @return {string} 找到的ID值
             */
            getTagId: function (inputValue) {
                var repeatTagId;
                u.find(this.tags, function (tagValue, tagId) {
                    if (tagValue === inputValue) {
                        repeatTagId = tagId;
                        return true;
                    }
                });
                return repeatTagId;
            },

            /**
             * 根据重复ID找到对应的DOM元素并高亮显示
             *
             * @param  {string} repeatTagId 重复ID
             */
            showRepeat: function (repeatTagId) {
                var items = this.main.getElementsByTagName('div');
                var element;
                u.find(items, function (item) {
                    if (lib.getAttribute(item, 'data-id') === repeatTagId) {
                        element = item;
                        return true;
                    }
                });
                lib.addClass(element, 'highlight');
                setTimeout(function () {
                    lib.removeClass(element, 'highlight');
                }, 300);
            },

            /**
             * 添加标签
             *
             * @param {string|Array} tagValue 标签值
             */
            add: function (tagValue) {
                var me = this;
                if (!tagValue) {
                    return;
                }
                var separator = '[' + me.separator;
                separator = separator.split('').join('\\') + ']';
                var regExps = new RegExp(separator);
                if (u.isArray(tagValue)) {
                    u.each(tagValue, function (item) {
                        me.add(item);
                    });
                    return;
                }
                tagValue = tagValue.toString();
                var tagArray = tagValue.split(regExps);
                me.createTags(tagArray);
            },

            /**
             * 根据HTMLElement删除对应的DOM元素以及标签的值
             *
             * @param  {HTMLElement} target 目标元素
             */
            removeTag: function (target) {
                var dataId = lib.getAttribute(target, 'data-id');
                var itemParent = target.parentNode;
                if (itemParent) {
                    itemParent.removeChild(target);
                    try {
                        delete this.tags[dataId];
                    }
                    catch (deleteError) {
                        this.tags[dataId] = null;
                    }
                }
            },

            /**
             * 删除
             *
             * @param  {string} value 标签值
             */
            remove: function (value) {
                var me = this;
                u.find(me.tags, function (tagValue, key) {
                    if (tagValue === value) {
                        var items = me.main.getElementsByTagName('div');
                        u.find(items, function (item) {
                            if (lib.getAttribute(item, 'data-id') === key) {
                                me.removeTag(item);
                                return true;
                            }
                        });
                        return true;
                    }
                });
            },

            /**
             * 获取Tag的值
             *
             * @return {Array}
             */
            getRawValue: function () {
                return u.values(this.tags);
            },

            /**
             * 将值从数组转换成字符串，
             *
             * @param {Array} rawValue 值
             * @return {string}
             */
            stringifyValue: function (rawValue) {
                return rawValue != null ? rawValue.join(',') : '';
            },

            /**
             * 以数组的形式输出标签值
             *
             * @return {Array} 标签值
             * @override
             */
            getArrayValue: function () {
                return u.values(this.tags);
            },

            // 重新渲染
            repaint: paint.createRepaint(
                InputControl.prototype.repaint,
                paint.style('width'),
                {
                    name: ['disabled', 'readOnly'],
                    paint: function (choose, disabled, readOnly) {
                        var input = choose.input;
                        input.disabled = disabled;
                        input.readOnly = readOnly;
                    }
                },
                {
                    name: ['rawValue'],
                    paint: function (choose, rawValue) {
                        choose.setTagValue(rawValue);
                        choose.setInputValue('');
                    }
                }
            )
        };

        /**
         * 绑定特殊的按键
         *
         * @param {Event} e DOM事件对象
         */
        function dispatchSpecialKey(e) {
            var keyCode = e.which || e.keyCode;
            if (keyCode === 13) {
                // 回车事件对输入进行预处理
                this.add(this.getInputValue());
                this.setInputValue('');
            }
            // 处理删除键和退格键事件
            else if (keyCode === 8 || keyCode === 46) {
                // 判断是否输入为空
                if (this.getInputValue() === '') {
                    var items = this.main.getElementsByTagName('div');
                    if (items && items.length > 0) {
                        // 删除最后一个tag
                        this.removeTag(items[items.length - 1]);
                    }
                }
            }
        }

        // 绑定到ESUI
        lib.inherits(TagChoose, InputControl);
        require('esui/main').register(TagChoose);
        return TagChoose;
    }
);
