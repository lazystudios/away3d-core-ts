///<reference path="../../_definitions.ts"/>

module away.materials
{
	//import away3d.*;
	//import away3d.managers.*;
	//import away3d.materials.compilation.*;
	//import away3d.textures.*;

	//use namespace arcane;

	/**
	 * BasicSpecularMethod provides the default shading method for Blinn-Phong specular highlights (an optimized but approximated
	 * version of Phong specularity).
	 */
	export class BasicSpecularMethod extends away.materials.LightingMethodBase
	{
		public _pUseTexture:boolean;
		public _pTotalLightColorReg:away.materials.ShaderRegisterElement;
		public _pSpecularTextureRegister:away.materials.ShaderRegisterElement;
		public _pSpecularTexData:away.materials.ShaderRegisterElement;
		public _pSpecularDataRegister:away.materials.ShaderRegisterElement;

		private _texture:away.textures.Texture2DBase;

		private _gloss:number = 50;
		private _specular:number = 1;
		private _specularColor:number = 0xffffff;
		public _iSpecularR:number = 1;
		public _iSpecularG:number = 1;
		public _iSpecularB:number = 1;
		private _shadowRegister:away.materials.ShaderRegisterElement;
		public _pIsFirstLight:boolean;

		/**
		 * Creates a new BasicSpecularMethod object.
		 */
			constructor()
		{
			super();
		}

		/**
		 * @inheritDoc
		 */
		public iInitVO(vo:away.materials.MethodVO)
		{
			vo.needsUV = this._pUseTexture;
			vo.needsNormals = vo.numLights > 0;
			vo.needsView = vo.numLights > 0;
		}

		/**
		 * The sharpness of the specular highlight.
		 */
		public get gloss():number
		{
			return this._gloss;
		}

		public set gloss(value:number)
		{
			this._gloss = value;
		}

		/**
		 * The overall strength of the specular highlights.
		 */
		public get specular():number
		{
			return this._specular;
		}

		public set specular(value:number)
		{
			if (value == this._specular)
				return;

			this._specular = value;
			this.updateSpecular();
		}

		/**
		 * The colour of the specular reflection of the surface.
		 */
		public get specularColor():number
		{
			return this._specularColor;
		}

		public set specularColor(value:number)
		{
			if (this._specularColor == value)
				return;

			// specular is now either enabled or disabled
			if (this._specularColor == 0 || value == 0)
				this.iInvalidateShaderProgram();

			this._specularColor = value;
			this.updateSpecular();
		}

		/**
		 * The bitmapData that encodes the specular highlight strength per texel in the red channel, and the sharpness
		 * in the green channel. You can use SpecularBitmapTexture if you want to easily set specular and gloss maps
		 * from grayscale images, but prepared images are preferred.
		 */
		public get texture():away.textures.Texture2DBase
		{
			return this._texture;
		}

		public set texture(value:away.textures.Texture2DBase)
		{

			var b:boolean = ( value != null );

			if (b != this._pUseTexture || (value && this._texture && (value.hasMipMaps != this._texture.hasMipMaps || value.format != this._texture.format))) {
				this.iInvalidateShaderProgram();
			}
			this._pUseTexture = b;//Boolean(value);
			this._texture = value;

		}

		/**
		 * @inheritDoc
		 */
		public copyFrom(method:ShadingMethodBase)
		{

			var m:any = method;
			var bsm:BasicSpecularMethod = <BasicSpecularMethod> method;

			var spec:BasicSpecularMethod = bsm;//BasicSpecularMethod(method);
			this.texture = spec.texture;
			this.specular = spec.specular;
			this.specularColor = spec.specularColor;
			this.gloss = spec.gloss;
		}

		/**
		 * @inheritDoc
		 */
		public iCleanCompilationData()
		{
			super.iCleanCompilationData();
			this._shadowRegister = null;
			this._pTotalLightColorReg = null;
			this._pSpecularTextureRegister = null;
			this._pSpecularTexData = null;
			this._pSpecularDataRegister = null;
		}

		/**
		 * @inheritDoc
		 */
		public iGetFragmentPreLightingCode(vo:away.materials.MethodVO, regCache:away.materials.ShaderRegisterCache):string
		{
			var code:string = "";

			this._pIsFirstLight = true;

			if (vo.numLights > 0) {

				this._pSpecularDataRegister = regCache.getFreeFragmentConstant();
				vo.fragmentConstantsIndex = this._pSpecularDataRegister.index*4;

				if (this._pUseTexture) {

					this._pSpecularTexData = regCache.getFreeFragmentVectorTemp();
					regCache.addFragmentTempUsages(this._pSpecularTexData, 1);
					this._pSpecularTextureRegister = regCache.getFreeTextureReg();
					vo.texturesIndex = this._pSpecularTextureRegister.index;
					code = this.pGetTex2DSampleCode(vo, this._pSpecularTexData, this._pSpecularTextureRegister, this._texture);

				} else {

					this._pSpecularTextureRegister = null;
				}


				this._pTotalLightColorReg = regCache.getFreeFragmentVectorTemp();
				regCache.addFragmentTempUsages(this._pTotalLightColorReg, 1);
			}

			return code;
		}

		/**
		 * @inheritDoc
		 */
		public iGetFragmentCodePerLight(vo:away.materials.MethodVO, lightDirReg:away.materials.ShaderRegisterElement, lightColReg:away.materials.ShaderRegisterElement, regCache:away.materials.ShaderRegisterCache):string
		{
			var code:string = "";
			var t:away.materials.ShaderRegisterElement;

			if (this._pIsFirstLight) {

				t = this._pTotalLightColorReg;

			} else {

				t = regCache.getFreeFragmentVectorTemp();
				regCache.addFragmentTempUsages(t, 1);

			}

			var viewDirReg:ShaderRegisterElement = this._sharedRegisters.viewDirFragment;
			var normalReg:ShaderRegisterElement = this._sharedRegisters.normalFragment;

			// blinn-phong half vector model

			//TODO: AGAL <> GLSL

			code += "add " + t + ", " + lightDirReg + ", " + viewDirReg + "\n" + "nrm " + t + ".xyz, " + t + "\n" + "dp3 " + t + ".w, " + normalReg + ", " + t + "\n" + "sat " + t + ".w, " + t + ".w\n";


			if (this._pUseTexture) {

				//TODO: AGAL <> GLSL

				// apply gloss modulation from texture
				code += "mul " + this._pSpecularTexData + ".w, " + this._pSpecularTexData + ".y, " + this._pSpecularDataRegister + ".w\n" + "pow " + t + ".w, " + t + ".w, " + this._pSpecularTexData + ".w\n";


			} else {

				//TODO: AGAL <> GLSL

				code += "pow " + t + ".w, " + t + ".w, " + this._pSpecularDataRegister + ".w\n";


			}


			// attenuate
			if (vo.useLightFallOff) {

				//TODO: AGAL <> GLSL
				code += "mul " + t + ".w, " + t + ".w, " + lightDirReg + ".w\n";


			}


			if (this._iModulateMethod != null) {

				//TODO: AGAL <> GLSL

				if (this._iModulateMethodScope != null) {
					code += this._iModulateMethod.apply(this._iModulateMethodScope, [vo, t, regCache, this._sharedRegisters]);
				} else {
					throw "Modulated methods needs a scope";
				}

				//code += this._iModulateMethod (vo, t, regCache, this._sharedRegisters);

			}


			//TODO: AGAL <> GLSL
			code += "mul " + t + ".xyz, " + lightColReg + ", " + t + ".w\n";

			if (!this._pIsFirstLight) {
				//TODO: AGAL <> GLSL
				code += "add " + this._pTotalLightColorReg + ".xyz, " + this._pTotalLightColorReg + ", " + t + "\n";

				regCache.removeFragmentTempUsage(t);

			}

			this._pIsFirstLight = false;

			return code;
		}

		/**
		 * @inheritDoc
		 */
		public iGetFragmentCodePerProbe(vo:away.materials.MethodVO, cubeMapReg:away.materials.ShaderRegisterElement, weightRegister:string, regCache:away.materials.ShaderRegisterCache):string
		{
			var code:string = "";
			var t:away.materials.ShaderRegisterElement;

			// write in temporary if not first light, so we can add to total diffuse colour
			if (this._pIsFirstLight) {

				t = this._pTotalLightColorReg;

			} else {

				t = regCache.getFreeFragmentVectorTemp();
				regCache.addFragmentTempUsages(t, 1);

			}

			var normalReg:away.materials.ShaderRegisterElement = this._sharedRegisters.normalFragment;
			var viewDirReg:away.materials.ShaderRegisterElement = this._sharedRegisters.viewDirFragment;

			//TODO: AGAL <> GLSL

			code += "dp3 " + t + ".w, " + normalReg + ", " + viewDirReg + "\n" + "add " + t + ".w, " + t + ".w, " + t + ".w\n" + "mul " + t + ", " + t + ".w, " + normalReg + "\n" + "sub " + t + ", " + t + ", " + viewDirReg + "\n" + "tex " + t + ", " + t + ", " + cubeMapReg + " <cube," + (vo.useSmoothTextures? "linear" : "nearest") + ",miplinear>\n" + "mul " + t + ".xyz, " + t + ", " + weightRegister + "\n";


			if (this._iModulateMethod != null) {

				//TODO: AGAL <> GLSL

				if (this._iModulateMethodScope != null) {
					code += this._iModulateMethod.apply(this._iModulateMethodScope, [vo, t, regCache, this._sharedRegisters]);
				} else {
					throw "Modulated methods needs a scope";
				}

				//code += this._iModulateMethod (vo, t, regCache, this._sharedRegisters);

			}

			/*
			 if (this._iModulateMethod!= null)
			 {

			 //TODO: AGAL <> GLSL
			 code += this._iModulateMethod(vo, t, regCache, this._sharedRegisters);

			 }
			 */

			if (!this._pIsFirstLight) {

				//TODO: AGAL <> GLSL
				code += "add " + this._pTotalLightColorReg + ".xyz, " + this._pTotalLightColorReg + ", " + t + "\n";

				regCache.removeFragmentTempUsage(t);

			}

			this._pIsFirstLight = false;

			return code;
		}

		/**
		 * @inheritDoc
		 */
		public iGetFragmentPostLightingCode(vo:away.materials.MethodVO, regCache:away.materials.ShaderRegisterCache, targetReg:away.materials.ShaderRegisterElement):string
		{
			var code:string = "";

			if (vo.numLights == 0)
				return code;

			if (this._shadowRegister) {

				//TODO: AGAL <> GLSL
				code += "mul " + this._pTotalLightColorReg + ".xyz, " + this._pTotalLightColorReg + ", " + this._shadowRegister + ".w\n";

			}


			if (this._pUseTexture) {

				// apply strength modulation from texture

				//TODO: AGAL <> GLSL
				code += "mul " + this._pTotalLightColorReg + ".xyz, " + this._pTotalLightColorReg + ", " + this._pSpecularTexData + ".x\n";

				regCache.removeFragmentTempUsage(this._pSpecularTexData);


			}

			// apply material's specular reflection

			//TODO: AGAL <> GLSL

			code += "mul " + this._pTotalLightColorReg + ".xyz, " + this._pTotalLightColorReg + ", " + this._pSpecularDataRegister + "\n" + "add " + targetReg + ".xyz, " + targetReg + ", " + this._pTotalLightColorReg + "\n";

			regCache.removeFragmentTempUsage(this._pTotalLightColorReg);

			return code;
		}

		/**
		 * @inheritDoc
		 */
		public iActivate(vo:away.materials.MethodVO, stage3DProxy:away.managers.Stage3DProxy)
		{
			//var context : Context3D = stage3DProxy._context3D;

			if (vo.numLights == 0)
				return;

			if (this._pUseTexture) {

				stage3DProxy._iContext3D.setSamplerStateAt(vo.texturesIndex, vo.repeatTextures? away.display3D.Context3DWrapMode.REPEAT : away.display3D.Context3DWrapMode.CLAMP, vo.useSmoothTextures? away.display3D.Context3DTextureFilter.LINEAR : away.display3D.Context3DTextureFilter.NEAREST, vo.useMipmapping? away.display3D.Context3DMipFilter.MIPLINEAR : away.display3D.Context3DMipFilter.MIPNONE);
				stage3DProxy._iContext3D.setTextureAt(vo.texturesIndex, this._texture.getTextureForStage3D(stage3DProxy));

			}

			var index:number = vo.fragmentConstantsIndex;
			var data:number[] = vo.fragmentData;
			data[index] = this._iSpecularR;
			data[index + 1] = this._iSpecularG;
			data[index + 2] = this._iSpecularB;
			data[index + 3] = this._gloss;
		}

		/**
		 * Updates the specular color data used by the render state.
		 */
		private updateSpecular()
		{
			this._iSpecularR = (( this._specularColor >> 16) & 0xff)/0xff*this._specular;
			this._iSpecularG = (( this._specularColor >> 8) & 0xff)/0xff*this._specular;
			this._iSpecularB = ( this._specularColor & 0xff)/0xff*this._specular;
		}

		/**
		 * Set internally by the compiler, so the method knows the register containing the shadow calculation.
		 */
		public set iShadowRegister(shadowReg:away.materials.ShaderRegisterElement)
		{

			this._shadowRegister = shadowReg;

		}

		public setIShadowRegister(shadowReg:away.materials.ShaderRegisterElement)
		{

			this._shadowRegister = shadowReg;

		}


	}
}
