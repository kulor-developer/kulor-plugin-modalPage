define( "ModalPage" , [ "Base" , "Template" , "RequireFile" , "ModalView" ] , function( Base , Template , RequireFile , ModalView ){
	"use strict"
	/*!
	 *	富客户端 提供一个page管理
	 * 	@pageListId 		{string} 	自定义一个pageListId
	 *	@$pageContainer 	{JqueryDom} page主体容器
	 *	@pages 				{json}
	 *		- pageName 		{string} 	js业务url
	 * 		eg 	: { home : "js/home.js" , page : "js/page.js" }
	 * 	@opt 				{json}
	 * 		- tabEvent 				{function} 	
	 * 		- displayEvent 			{function} 	
	 */
	var PageList 	= Base.extend( function( pageListId , $pageContainer , pages , opt ){
		this._pageListConfig 	= {
			$container 		: 0 ,
			originPages		: $.extend( {} , pages ) ,
			originOpt 		: $.extend( {} , opt ) ,
			changeCallback 	: []
		};
		this.length 	= 0;
		if ( $pageContainer.length ) {
			this.initPageContainer( $pageContainer );
		}
		if( opt ){
			$.extend( this._pageListConfig , pages , opt );
			delete opt.options;
		}
		this.addPage( pages );
		this.__pageListConfig.pageItems.push( this );
		if( this._pageListConfig.tabEvent ){
			this.addTabEvent( this._pageListConfig.tabEvent , this._pageListConfig.displayEvent );
		}
	} , {
		implements 		: [ new Template() , new RequireFile() ],
		__pageListConfig 	: {
			templateIds : {
				container 	: "pageContainerTemplate"
			} ,
			pageItems 	: []
		} ,
		/*!
		 *	初始化page页面
		 * 	@$container 	{JQDOM}
		 */
		initPageContainer 	: function( $container ){
			this._pageListConfig.$container = $container;
			$container.addClass( "uiSub-page-container" );
			// 	暂留提供page主题相关的引入
			// 	$container.html( this.getTemplate( this.__pageListConfig.templateIds.container) );
			return this;
		} ,
		addPage 		: function( pages ){
			for( var a in pages ){
				this[ a ] = new Page( this , pages[ a ] , a );
			}
			return this;
		} ,
		/*!
		 * 	添加 tab事件
		 *	@handle 		{function} 	执行事件 每次即时执行事件
		 * 	@changeCallback {function} 	页面切换事件 页面display时执行
		 */
		addTabEvent 	: function( handle , changeCallback ){
			var _page 	= this._pageListConfig.originPages;
			if( $.isFunction( handle ) ){
				for( var a in _page ){
					if( a !== "opt" ){
						handle( a );
					}
				}
			}
			return this.addTabDisplayEvent( changeCallback );
		} ,
		/*!
		 * 	添加 页面显示切换事件
		 *	@changeCallback {function} 	页面切换事件 页面display时执行
		 */
		addTabDisplayEvent 	: function( changeCallback ){
			if( $.isFunction( changeCallback ) ){
				this._pageListConfig.changeCallback.push( changeCallback );
			}
			return this;
		}
	} ) ,
		/*!
		 *	单个page模块
		 *	@belongPageList 	{PageList}
		 *	@jsPath 			{string} 	js引用路径
		 * 	@pageName 			{string} 	page名称
		 */
		Page 	= Base.extend( function( belongPageList , jsPath , pageName ){
			this._pageConfig 	= {
				pageName 	: pageName ,
				$container 	: false ,
				ready 		: false ,
				jsPath 		: jsPath ,
				eventList 	: [] ,
				belongPageList 	: 	belongPageList
			}
			belongPageList.length++;
		} , {
			__pageConfig: {
				templateIds 	: {
					container 	: "subPageContainerTemplate"
				}
			} ,
			display 	: function(){
				return this.displayPageModal.apply( this , arguments );
			} ,
			get 		: function(){
				return this.getPageModal.apply( this , arguments );
			} ,
			ready 		: function(){
				return this.setPageToReady.apply( this , arguments );
			} ,
			displayPageModal	: function( func ){
				var _self 			= this ,
					_pageListConfig = this._pageConfig.belongPageList._pageListConfig ,
					_$container 	= _pageListConfig.$container;
				
				_self.getPageModal( function(){
					_$container.find( ".uiSub-page-singlePage" ).removeClass( "active" );
					_self._pageConfig.$container.addClass( "active" );
					for( var i = 0 , len = _pageListConfig.changeCallback.length; i < len; i++ ){
						_pageListConfig.changeCallback[ i ].call( _self , _self._pageConfig.pageName );
					}
					if( $.isFunction( func ) ){ func.call( _self ); };
				} );
				return this;
			} ,
			handlePageEventList 	: function(){
				// 转移事件队列，将队列池清空，防止队列中事件互调造成内存溢出
				var _el = [].concat( this._pageConfig.eventList );
				this._pageConfig.eventList.length = 0;
				for( var i = 0 , len = _el.length; i < len; i++){
					_el[ i ].call( this );
				}
				_el = null;
				return this;
			} ,
			getPageModal 		: function( func ){
				this._pageConfig.eventList.push( function(){
					if( $.isFunction( func ) && 
						( $.isFunction( this._pageConfig.belongPageList._pageListConfig.callBack ) ? this._pageConfig.belongPageList._pageListConfig.callBack.call( this ) !== false : true )
					){ func(); }
				} );
				if ( this._pageConfig.ready == "ready" ) {
					this.handlePageEventList();
				} else if( this._pageConfig.ready != "waiting" ){
					this._pageConfig.belongPageList.getFile( this._pageConfig.jsPath );
					this._pageConfig.ready = "waiting";
				}
				return this;
			} ,	
			/*!
			 *	绘制page的内容
			 * 	@templateId 	{string} 	
			 */		
			getPageModalUI 		: function( templateId ){
				var _$container = this._pageConfig.belongPageList._pageListConfig.$container;
				if( !this._pageConfig.$container ){
					this._pageConfig.$container 	= $( this._pageConfig.belongPageList.getTemplate( this.__pageConfig.templateIds.container ) );
					_$container.append( this._pageConfig.$container );
				}
				if( templateId ){
					this._pageConfig.$container.html( this._pageConfig.belongPageList.getTemplate( templateId ) );
				}
				return this._pageConfig.$container;
			} ,
			setPageToReady 	: function( pageInfo , constructor ){
				var _self = this ,
					_done = function(){
						_self._pageConfig.ready = "ready";
						_self.getPageModalUI();
						$.extend( _self , constructor.call( _self , _self._pageConfig.belongPageList ) );
						_self.handlePageEventList();
					};
				if ( typeof pageInfo == "function" ) {
					constructor = pageInfo;
					pageInfo 	= {};
				}
				if ( pageInfo.requireFile instanceof Array ) {
					_self._pageConfig.belongPageList.getFile( pageInfo.requireFile , _done );	
				} else {
					_done();
				}
				return this;
			}
		} );
	return PageList;
} );