///<reference path="../../_definitions.ts"/>

module away.animators
{
	import IRenderable						= away.base.IRenderable;
	import Camera3D							= away.cameras.Camera3D;
	import Context3DVertexBufferFormat		= away.display3D.Context3DVertexBufferFormat
	import Vector3D							= away.geom.Vector3D;
	import Stage3DProxy						= away.managers.Stage3DProxy;
	
	/**
	 * ...
	 */
	export class ParticleOscillatorState extends ParticleStateBase
	{
		private _particleOscillatorNode:ParticleOscillatorNode;
		private _oscillator:Vector3D;
		private _oscillatorData:Vector3D;
		
		/**
		 * Defines the default oscillator axis (x, y, z) and cycleDuration (w) of the state, used when in global mode.
		 */
		public get oscillator():Vector3D
		{
			return this._oscillator;
		}
		
		public set oscillator(value:Vector3D)
		{
			this._oscillator = value;

			this.updateOscillatorData();
		}
		
		constructor(animator:ParticleAnimator, particleOscillatorNode:ParticleOscillatorNode)
		{
			super(animator, particleOscillatorNode);
			
			this._particleOscillatorNode = particleOscillatorNode;
			this._oscillator = this._particleOscillatorNode._iOscillator;
			
			this.updateOscillatorData();
		}
		
		/**
		 * @inheritDoc
		 */
		public setRenderState(stage3DProxy:Stage3DProxy, renderable:IRenderable, animationSubGeometry:AnimationSubGeometry, animationRegisterCache:AnimationRegisterCache, camera:Camera3D)
		{
			var index:number /*int*/ = animationRegisterCache.getRegisterIndex(this._pAnimationNode, ParticleOscillatorNode.OSCILLATOR_INDEX);
			
			if (this._particleOscillatorNode.mode == ParticlePropertiesMode.LOCAL_STATIC)
				animationSubGeometry.activateVertexBuffer(index, this._particleOscillatorNode._iDataOffset, stage3DProxy, Context3DVertexBufferFormat.FLOAT_4);
			else
				animationRegisterCache.setVertexConst(index, this._oscillatorData.x, this._oscillatorData.y, this._oscillatorData.z, this._oscillatorData.w);
		}
		
		private updateOscillatorData()
		{
			if (this._particleOscillatorNode.mode == ParticlePropertiesMode.GLOBAL) {
				if (this._oscillator.w <= 0)
					throw(new Error("the cycle duration must greater than zero"));

				if (this._oscillatorData == null)
					this._oscillatorData = new Vector3D();

				this._oscillatorData.x = this._oscillator.x;
				this._oscillatorData.y = this._oscillator.y;
				this._oscillatorData.z = this._oscillator.z;
				this._oscillatorData.w = Math.PI*2/this._oscillator.w;
			}
		}
	}
}
