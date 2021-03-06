///<reference path="../../_definitions.ts"/>

module away.animators
{
	import Vector3D						= away.geom.Vector3D;
	import MaterialPassBase				= away.materials.MaterialPassBase;
	import ShaderRegisterElement		= away.materials.ShaderRegisterElement;

	/**
	 * A particle animation node used to apply a constant acceleration vector to the motion of a particle.
	 */
	export class ParticleAccelerationNode extends ParticleNodeBase
	{
		/** @private */
		public static ACCELERATION_INDEX:number /*int*/ = 0;
		
		/** @private */
		public _acceleration:Vector3D;

		/**
		 * Reference for acceleration node properties on a single particle (when in local property mode).
		 * Expects a <code>Vector3D</code> object representing the direction of acceleration on the particle.
		 */
		public static ACCELERATION_VECTOR3D:string = "AccelerationVector3D";
		
		/**
		 * Creates a new <code>ParticleAccelerationNode</code>
		 *
		 * @param               mode            Defines whether the mode of operation acts on local properties of a particle or global properties of the node.
		 * @param    [optional] acceleration    Defines the default acceleration vector of the node, used when in global mode.
		 */
		constructor(mode:number /*uint*/, acceleration:Vector3D = null)
		{
			super("ParticleAcceleration", mode, 3);
			
			this._pStateClass = ParticleAccelerationState;

			this._acceleration = acceleration || new Vector3D();
		}
		
		/**
		 * @inheritDoc
		 */
		public pGetAGALVertexCode(pass:MaterialPassBase, animationRegisterCache:AnimationRegisterCache):string
		{
			var accelerationValue:ShaderRegisterElement = (this._pMode == ParticlePropertiesMode.GLOBAL)? animationRegisterCache.getFreeVertexConstant() : animationRegisterCache.getFreeVertexAttribute();
			animationRegisterCache.setRegisterIndex(this, ParticleAccelerationNode.ACCELERATION_INDEX, accelerationValue.index);
			
			var temp:ShaderRegisterElement = animationRegisterCache.getFreeVertexVectorTemp();
			animationRegisterCache.addVertexTempUsages(temp, 1);
			
			var code:string = "mul " + temp + "," + animationRegisterCache.vertexTime + "," + accelerationValue + "\n";
			
			if (animationRegisterCache.needVelocity) {
				var temp2:ShaderRegisterElement = animationRegisterCache.getFreeVertexVectorTemp();
				code += "mul " + temp2 + "," + temp + "," + animationRegisterCache.vertexTwoConst + "\n";
				code += "add " + animationRegisterCache.velocityTarget + ".xyz," + temp2 + ".xyz," + animationRegisterCache.velocityTarget + ".xyz\n";
			}
			animationRegisterCache.removeVertexTempUsage(temp);
			
			code += "mul " + temp + "," + temp + "," + animationRegisterCache.vertexTime + "\n";
			code += "add " + animationRegisterCache.positionTarget + ".xyz," + temp + "," + animationRegisterCache.positionTarget + ".xyz\n";
			return code;
		}
		
		/**
		 * @inheritDoc
		 */
		public getAnimationState(animator:IAnimator):ParticleAccelerationState
		{
			return <ParticleAccelerationState> animator.getAnimationState(this);
		}
		
		/**
		 * @inheritDoc
		 */
		public _iGeneratePropertyOfOneParticle(param:ParticleProperties)
		{
			var tempAcceleration:Vector3D = param[ParticleAccelerationNode.ACCELERATION_VECTOR3D];
			if (!tempAcceleration)
				throw new Error("there is no " + ParticleAccelerationNode.ACCELERATION_VECTOR3D + " in param!");
			
			this._pOneData[0] = tempAcceleration.x/2;
			this._pOneData[1] = tempAcceleration.y/2;
			this._pOneData[2] = tempAcceleration.z/2;
		}
	}
}
