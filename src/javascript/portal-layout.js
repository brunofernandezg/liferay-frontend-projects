AUI.add('portal-layout', function(A) {

/*
* PortalLayout
*/
var L = A.Lang,
	isBoolean = L.isBoolean,
	isFunction = L.isFunction,
	isObject = L.isObject,
	isString = L.isString,
	isValue = L.isValue,

	DDM = A.DD.DDM,

	BORDER_STYLE = 'borderStyle',
	CONTAINER = 'container',
	DD = 'dd',
	DOWN = 'down',
	DRAG = 'drag',
	DRAG_NODE = 'dragNode',
	DRAG_NODES = 'dragNodes',
	DROP_CONTAINER = 'dropContainer',
	DROP_NODES = 'dropNodes',
	GROUPS = 'groups',
	ICON = 'icon',
	INDICATOR = 'indicator',
	LAZY_START = 'lazyStart',
	LEFT = 'left',
	NODE = 'node',
	OFFSET_HEIGHT = 'offsetHeight',
	OFFSET_WIDTH = 'offsetWidth',
	ON = 'on',
	PLACEHOLDER = 'placeholder',
	PORTAL_LAYOUT = 'portal-layout',
	PROXY = 'proxy',
	PROXY_NODE = 'proxyNode',
	RADIO = 'radio',
	RIGHT = 'right',
	SPACE = ' ',
	UP = 'up',

	EV_PLACEHOLDER_ALIGN = 'placeholderAlign',
	EV_QUADRANT_ENTER = 'quadrantEnter',
	EV_QUADRANT_EXIT = 'quadrantExit',
	EV_QUADRANT_OVER = 'quadrantOver',

	concat = function() {
		return Array.prototype.slice.call(arguments).join(SPACE);
	},

	nodeListSetter = function(val) {
		return A.all(val);
	},

	getCN = A.ClassNameManager.getClassName,

	CSS_DRAG_INDICATOR = getCN(PORTAL_LAYOUT, DRAG, INDICATOR),
	CSS_DRAG_INDICATOR_ICON = getCN(PORTAL_LAYOUT, DRAG, INDICATOR, ICON),
	CSS_DRAG_INDICATOR_ICON_LEFT = getCN(PORTAL_LAYOUT, DRAG, INDICATOR, ICON, LEFT),
	CSS_DRAG_INDICATOR_ICON_RIGHT = getCN(PORTAL_LAYOUT, DRAG, INDICATOR, ICON, RIGHT),
	CSS_ICON = getCN(ICON),
	CSS_ICON_RADIO_ON = getCN(ICON, RADIO, ON),

	TPL_PLACEHOLDER = '<div class="'+CSS_DRAG_INDICATOR+'">' +
							'<div class="'+concat(CSS_DRAG_INDICATOR_ICON, CSS_DRAG_INDICATOR_ICON_LEFT, CSS_ICON, CSS_ICON_RADIO_ON)+'"></div>' +
							'<div class="'+concat(CSS_DRAG_INDICATOR_ICON, CSS_DRAG_INDICATOR_ICON_RIGHT, CSS_ICON, CSS_ICON_RADIO_ON)+'"></div>' +
						'<div>';

function PortalLayout(config) {
	PortalLayout.superclass.constructor.apply(this, arguments);
}

A.mix(PortalLayout, {
	NAME: PORTAL_LAYOUT,

	ATTRS: {
		dd: {
			value: null,
			setter: function(val) {
				var instance = this;

				return A.merge(
					{
						bubbles: instance,
						groups: instance.get(GROUPS),
						target: true
					},
					val
				);
			},
			validator: isObject
		},

		proxyNode: {
			setter: function(val) {
				return isString(val) ? A.Node.create(val) : val;
			}
		},

		dragNodes: {
			value: false,
			setter: nodeListSetter
		},

		dropContainer: {
			value: function(dropNode) {
				return dropNode;
			},
			validator: isFunction
		},

		dropNodes: {
			value: false,
			setter: nodeListSetter
		},

		groups: {
			value: [PORTAL_LAYOUT]
		},

		lazyStart: {
			value: false,
			validator: isBoolean
		},

		placeholder: {
			value: TPL_PLACEHOLDER,
			setter: function(val) {
				var placeholder = isString(val) ? A.Node.create(val) : val;

				if (!placeholder.inDoc()) {
					A.getBody().append(
						placeholder.hide()
					);
				}

				return placeholder;
			}
		},

		proxy: {
			value: null,
			setter: function(val) {
				var instance = this;

				var defaults = {
					moveOnEnd: false,
					positionProxy: false
				};

				// if proxyNode is set remove the border from the default proxy
				if (instance.get(PROXY_NODE)) {
					defaults.borderStyle = null;
				}

				return A.merge(defaults, val || {});
			}
		}
	}
});

A.extend(PortalLayout, A.Base, {
	/*
	* Lifecycle
	*/
	initializer: function() {
		var instance = this;

		instance.bindUI();
	},

	bindUI: function() {
		var instance = this;

		// publishing placeholderAlign event
		instance.publish(EV_PLACEHOLDER_ALIGN, {
            defaultFn: instance._defPlaceholderAlign,
            queuable: false,
            emitFacade: true,
            bubbles: true
        });

		instance._bindDDEvents();
		instance._bindDropZones();
	},

	/*
	* Methods
	*/

	addDropNode: function(node, config) {
		var instance = this;

		node = A.one(node);

		if (!DDM.getDrop(node)) {
			instance.addDropTarget(
				new A.DD.Drop(
					A.merge(
						{
							bubbles: instance,
							node: node
						},
						config
					)
				)
			);
		}
	},

	addDropTarget: function(drop) {
		var instance = this;

		drop.addToGroup(
			instance.get(GROUPS)
		);
	},

	calculateDirections: function(drag) {
		var instance = this;
		var lastY = instance.lastY;
		var lastX = instance.lastX;

		var x = drag.lastXY[0];
		var y = drag.lastXY[1];

		// if the x change
		if (x != lastX) {
			// set the drag direction
			instance.XDirection = (x < lastX) ? LEFT : RIGHT;
		}

		// if the y change
		if (y != lastY) {
			// set the drag direction
			instance.YDirection = (y < lastY) ? UP : DOWN;
		}

		instance.lastX = x;
		instance.lastY = y;
	},

	calculateQuadrant: function(drag, drop) {
		var instance = this;
		var quadrant = 1;
		var region = drop.region;
		var mouseXY = drag.mouseXY;
		var mouseX = mouseXY[0];
		var mouseY = mouseXY[1];

		var top = region.top;
		var left = region.left;

		// (region.bottom - top) finds the height of the region
		var vCenter = top + (region.bottom - top)/2;
		// (region.right - left) finds the width of the region
		var hCenter = left + (region.right - left)/2;

		if (mouseY < vCenter) {
			quadrant = (mouseX > hCenter) ? 1 : 2;
		}
		else {
			quadrant = (mouseX < hCenter) ? 3 : 4;
		}

		instance.quadrant = quadrant;

		return quadrant;
	},

	removeDropTarget: function(drop) {
		var instance = this;

		drop.removeFromGroup(
			instance.get(GROUPS)
		);
	},

	_alignCondition: function() {
		var instance = this;
		var activeDrag = DDM.activeDrag;
		var activeDrop = instance.activeDrop;

		if (activeDrag && activeDrop) {
			var dragNode = activeDrag.get(NODE);
			var dropNode = activeDrop.get(NODE);

			return !dragNode.contains(dropNode);
		}

		return true;
	},

	_bindDDEvents: function() {
		var instance = this;
		var dd = instance.get(DD);
		var proxy = instance.get(PROXY);

		instance.get(DRAG_NODES).each(
			function(node, i) {
				dd.node = node;
				// creating DD.Drag instance and plugging the DDProxy
				new A.DD.Drag(dd).plug(A.Plugin.DDProxy, proxy);
			}
		);

		instance.on('drag:end', A.bind(instance._onDragEnd, instance));
		instance.on('drag:enter', A.bind(instance._onDragEnter, instance));
		instance.on('drag:exit', A.bind(instance._onDragExit, instance));
		instance.on('drag:over', A.bind(instance._onDragOver, instance));
		instance.on('drag:start', A.bind(instance._onDragStart, instance));

		instance.on(EV_QUADRANT_ENTER, instance._syncPlaceholderUI);
		instance.on(EV_QUADRANT_EXIT, instance._syncPlaceholderUI);
	},

	_bindDropZones: function() {
		var instance = this;

		instance.get(DROP_NODES).each(function(node, i) {
			instance.addDropNode(node);
		});
	},

	_defPlaceholderAlign: function(event) {
		var instance = this;
		var activeDrop = instance.activeDrop;
		var placeholder = instance.get(PLACEHOLDER);

		if (activeDrop && placeholder) {
			var region = activeDrop.region;
			var node = activeDrop.get('node');

			// sync placeholder size
			instance._syncPlaceholderSize();

			// align placeholder horizontally
			placeholder.setX(
				region.left
			);

			// align placeholder vertically
			placeholder.setY(
				// 1 and 2 quadrants are the top quadrants, so align to the region.top when quadrant < 3
				(instance.quadrant < 3) ?
					(region.top) : (region.bottom - placeholder.get(OFFSET_HEIGHT))
			);
		}
	},

	_evOutput: function() {
		var instance = this;

		return {
			drag: DDM.activeDrag,
			drop: instance.activeDrop,
			quadrant: instance.quadrant,
			XDirection: instance.XDirection,
			YDirection: instance.YDirection
		};
	},

	_fireQuadrantEvents: function() {
		var instance = this;
		var evOutput = instance._evOutput();
		var lastQuadrant = instance.lastQuadrant;
		var quadrant = instance.quadrant;

		if (quadrant != lastQuadrant) {
			// only trigger exit if it has previously entered in any quadrant
			if (lastQuadrant) {
				// merging event with the "last" information
				instance.fire(
					EV_QUADRANT_EXIT,
					A.merge(
						{
							lastDrag: instance.lastDrag,
							lastDrop: instance.lastDrop,
							lastQuadrant: instance.lastQuadrant,
							lastXDirection: instance.lastXDirection,
							lastYDirection: instance.lastYDirection
						},
						evOutput
					)
				);
			}

			// firing EV_QUADRANT_ENTER event
			instance.fire(EV_QUADRANT_ENTER, evOutput);
		}

		// firing EV_QUADRANT_OVER, align event fires like the drag over without bubbling for performance reasons
		instance.fire(EV_QUADRANT_OVER, evOutput);

		// updating "last" information
		instance.lastDrag = DDM.activeDrag;
		instance.lastDrop = instance.activeDrop;
		instance.lastQuadrant = quadrant;
		instance.lastXDirection = instance.XDirection;
		instance.lastYDirection = instance.YDirection;
	},

	_positionNode: function(event) {
		var instance = this;
		var activeDrag = DDM.activeDrag;
		var activeDrop = instance.activeDrop;

		if (activeDrag && activeDrop) {
			var dragNode = activeDrag.get(NODE);
			var dropNode = activeDrop.get(NODE);

			// detects if the activeDrop is a dd target (portlet) or a drop area only (column)
			var isTarget = isValue(dropNode.dd);

			if (instance._alignCondition()) {
				if (isTarget) {
					// top quadrants...
					if (instance.quadrant < 3) {
						dropNode.placeBefore(dragNode);
					}
					// bottom quadrants
					else {
						dropNode.placeAfter(dragNode);
					}
				}
				// interacting with the columns (drop areas only)
				else {
					// find the dropContainer of the dropNode, the default DROP_CONTAINER function returns the dropNode
					var dropContainer = instance.get(DROP_CONTAINER).apply(instance, [dropNode]);

					// appendding the dragNode on the dropContainer
					dropContainer.append(dragNode);
				}
			}
		}
	},

	_syncPlaceholderUI: function(event) {
		var instance = this;

		if (instance._alignCondition()) {
			// firing placeholderAlign event
			instance.fire(EV_PLACEHOLDER_ALIGN, {
				drop: instance.activeDrop,
				originalEvent: event
			});
		}
	},

	_syncPlaceholderSize: function() {
		var instance = this;
		var node = instance.activeDrop.get(NODE);

		var placeholder = instance.get(PLACEHOLDER);

		if (placeholder) {
			placeholder.set(
				OFFSET_WIDTH,
				node.get(OFFSET_WIDTH)
			);
		}
	},

	_syncProxyNodeUI: function(event) {
		var instance = this;
		var dragNode = DDM.activeDrag.get(DRAG_NODE);
		var proxyNode = instance.get(PROXY_NODE);

		if (proxyNode && !proxyNode.compareTo(dragNode)) {
			dragNode.append(proxyNode);

			instance._syncProxyNodeSize();
		}
	},

	_syncProxyNodeSize: function() {
		var instance = this;
		var node = DDM.activeDrag.get(NODE);
		var proxyNode = instance.get(PROXY_NODE);

		if (node && proxyNode) {
			proxyNode.set(
				OFFSET_HEIGHT,
				node.get(OFFSET_HEIGHT)
			);

			proxyNode.set(
				OFFSET_WIDTH,
				node.get(OFFSET_WIDTH)
			);
		}
	},

	/*
	* Listeners
	*/
	_onDragEnd: function(event) {
		var instance = this;
		var placeholder = instance.get(PLACEHOLDER);
		var proxyNode = instance.get(PROXY_NODE);

		if (proxyNode) {
			proxyNode.remove();
		}

		if (placeholder) {
			placeholder.hide();
		}

		instance._positionNode(event);

		// reset the last information
		instance.lastQuadrant = null;
		instance.lastXDirection = null;
		instance.lastYDirection = null;
	},

	// fires after drag:start
	_onDragEnter: function(event) {
		var instance = this;
		var drop = event.drop;
		var placeholder = instance.get(PLACEHOLDER);

		// instance.lazyEvents is property which relies to the LAZY_START option
		// when LAZY_START is true we prevent the first drag:event fires
		// and the dragNode only find an activeDrop after intersects with a dropZone.
		if (instance.lazyEvents) {
			// set the first activeDrop to null, avoid the drag:enter align the placeholder on the parent dropZone (column)
			instance.activeDrop = null;
		}
		// firing the drag:event...
		else {
			// if LAZY_START is true the placeholder was not showed on drag:start, showing the placeholder here..
			if (placeholder) {
				placeholder.show();
			}

			instance.activeDrop = DDM.activeDrop;

			instance._syncPlaceholderUI(event);
		}

		instance.lazyEvents = false;
	},

	_onDragExit: function(event) {
		var instance = this;

		instance._syncPlaceholderUI(event);

		instance.activeDrop = DDM.activeDrop;

		instance.lastActiveDrop = DDM.activeDrop;
	},

	_onDragOver: function(event) {
		var instance = this;
		var drag = event.drag;

		// prevent drag over bubbling, filtering the top most element
		if (instance.activeDrop == DDM.activeDrop) {
			instance.calculateDirections(drag);

			instance.calculateQuadrant(drag, instance.activeDrop);

			instance._fireQuadrantEvents();
		}
	},

	// fires before drag:enter
	_onDragStart: function(event) {
		var instance = this;
		var placeholder = instance.get(PLACEHOLDER);

		if (instance.get(PROXY)) {
			instance._syncProxyNodeUI(event);
		}

		// preventing the init drag:enter event to bubble
		if (instance.get(LAZY_START)) {
			instance.lazyEvents = true;
		}
		// in normal mode, just show the placeholder on drag:start...
		else {
			// if the activeDrop is not over a dropZone, the drag:start won't be fired at start
			// so, we need to show the placeholder here, just in case.
			if (placeholder) {
				placeholder.show();
			}
		}

		instance.activeDrop = DDM.activeDrop;
	}
});

A.PortalLayout = PortalLayout;

}, '@VERSION', { requires: [ 'aui-base', 'dd', 'portal-layout-css' ] });