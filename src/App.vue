<template xmlns="http://www.w3.org/1999/html">
  <div class="banner">
    <el-row>
      <el-text style="display: block; margin-top: 10px;color: black">
        <span style="margin-left: 20px; font-size: 25px">Attention Visualization</span>
        <small> By
          <a href="https://yxinyu.com">Xinyu</a>
        </small>
      </el-text>
    </el-row>
    <el-row>
      <el-text style="display: block;">
        <span style="margin-left: 20px">Please use this
          <a href="https://github.com/cauyxy/bilivideos/tree/master/attn-visual">script</a>
          to generate the visualization file.</span>
      </el-text>
    </el-row>
    <el-row>
      <el-text style="display: block;">
        <span style="margin-left: 20px">Recently I’m interested in LLM, and here is some
          <a href="https://bytedance.feishu.cn/docx/doxcn3zm448MK9sK6pHuPsqtH8f">Modest Understandings on LLM</a>.
          </span>
      </el-text>
    </el-row>
  </div>


  <el-row STYLE=" background-color: rgba(5, 225, 5, 0.5);height: 5vh;">
    <el-text style="margin-left:20px; font-family: 'DMSans', sans-serif;font-size: 15px">
      ModelName: {{ model_name }}
    </el-text>
  </el-row>

  <el-row class="op-area">
    <el-col :span="8">
      <el-button
          type="primary"
          style="font-family: 'DMSans', sans-serif"
          plain
          v-on:click="loadDefaultData">
        LoadSampleFile
      </el-button>
    </el-col>
    <el-col :span="8">
      <el-button
          type="primary"
          style="font-family: 'DMSans', sans-serif"
          v-on:click="loadLocalFileHandler">
        LoadFromLocal
      </el-button>
    </el-col>

    <el-col :span="8">
      <el-select
          v-model="current_layer" class="m-2" placeholder="Select" size="large">
        <el-option
            style="font-family: 'DMSans', sans-serif"
            v-for="idx in layer_cnt"
            :key="idx"
            :label="'Layer' + idx"
            :value="idx-1"
        />
      </el-select>
    </el-col>
  </el-row>


  <div class="head-row" v-for="ridx in 4" :key="ridx">
    <div
        v-for="cidx in head_cnt/4"
        class="checkbox-container"
        style="border:  2px"
        :ref="getHeadRef((ridx - 1) * head_cnt / 4 + cidx - 1)">
      <label class="head-checkbox">
        <input
            type="checkbox"
            v-model="current_heads"
            :key="(ridx-1) * head_cnt/4 + cidx - 1"
            :value="(ridx-1) * head_cnt/4 + cidx - 1">
        <span class="checkmark" style="white-space: pre-wrap;">
          {{ ((ridx - 1) * head_cnt / 4 + cidx - 1).toString().padStart(2, ' ') }}
        </span>
      </label>
    </div>
  </div>
  <el-divider/>
  <el-row justify="center">
    <el-col :span="8">
      <div class="display-panel">
        <div class="head-title">
          Prompt
        </div>
        <hr style="margin: 10px">

        <div class="text_area">
          <p v-if="attnData">
            <template
                v-for="token in this.attnData.prompt_lis"
                :key="token.sentence_idx">
                   <span
                       class="token-span"
                       :title="token.sentence_idx"
                       :id="token.sentence_idx"
                       :ref="getRef(token.sentence_idx)">
              {{ processedToken(token.token_str) }}
            </span>
              <br v-if="processedToken(token.token_str).includes('↵')">
            </template>
          </p>
          <p v-else>
            <span>Click Load to load sample data</span>
          </p>
        </div>
      </div>

    </el-col>
    <el-col :span="8">
      <div class="display-panel">
        <div class="head-title">
          Response
        </div>
        <hr style="margin: 10px">
        <div class="text_area">
          <p v-if="attnData">
            <template
                v-for="token in this.attnData.output_lis"
                :key="token.sentence_idx">
              <span
                  class="token-span"
                  @click="handleReDrawAttn"
                  :id="token.sentence_idx"
                  :ref="getRef(token.sentence_idx)">
              {{ processedToken(token.token_str) }}
                <a class="tooltip"> {{ this.getTopkProbs(token.sentence_idx) }} </a>
            </span>
              <br v-if="processedToken(token.token_str).includes('↵')">
            </template>

          </p>
          <p v-else>
            <span>Click Load to load sample data</span>
          </p>
        </div>
      </div>
    </el-col>
  </el-row>

</template>

<script>

export default {
  name: 'App',
  data() {
    return {
      attnData: null,
      model_name: "VoidModel",
      prompt_len: 0,
      head_cnt: 0,
      layer_cnt: null,
      current_layer: 0,
      current_heads: [],
      colorList: ["red", "lime", "blue", "yellow", "aqua", "magenta"],
      colorMap: new Map,
      internalJReader: null,
    }
  },
  watch: {
    current_heads(newVal, oldVal) {
      if (newVal.length < oldVal.length) {
        let removed = oldVal.filter(x => !newVal.includes(x));
        this.removeHead(removed);
        this.setHeadColorByIdx(removed, "white");
      }

      if (newVal.length > oldVal.length) {
        let added = newVal.filter(x => !oldVal.includes(x));
        if (newVal.length > 6) {
          let removed = newVal.shift();
          this.removeHead(removed);
          this.setHeadColorByIdx(removed, "white");
        }
        const c = this.addHead(added);
        this.setHeadColorByIdx(added, c);
      }
    },
  },
  computed: {
    getRef() {
      return (sentenceIdx) => `StsIdx${sentenceIdx}`;
    },
    getHeadRef() {
      return (hdIdx) => `HeadIdx${hdIdx}`;
    },
    processedToken() {
      return (originalText) =>
          originalText
              .replace("Ġ", " ")
              .replace("\n", "↵")
              .replace("▁", " ")
              .replace("Ċ", "↵")
              .replace("<0x0A>", "↵");
    }
  },
  mounted() {
    this.internalJReader = document.createElement('input');
    this.internalJReader.type = 'file';
    this.internalJReader.accept = '.json';
    this.internalJReader.onchange = (event) => {
      let file = event.target.files[0];
      this.loadLocalFile(file);
      event.target.value = null;
    };
  },
  methods: {
    loadLocalFileHandler() {
      this.resetDynamicData()
      this.internalJReader.click();
    },

    loadLocalFile(file) {
      let reader = new FileReader();
      reader.onload = (event) => {
        let fileData = event.target.result;
        this.processFileData(fileData);
      };

      reader.onerror = (event) => {
        console.error('Error:', event.target.error);
      };

      reader.readAsText(file);
    },

    processFileData(fileData) {
      try {
        this.attnData = JSON.parse(fileData);
        this.model_name = this.attnData.model_name;
        this.prompt_len = this.attnData.prompt_lis.length;
        this.all_tokens = this.prompt_len + this.attnData.output_lis.length;
        this.head_cnt = this.attnData.head_count;
        this.layer_cnt = this.attnData.layer_count;
      } catch (error) {
        console.error('Error:', error);
      }
    },

    loadDefaultData() {
      this.resetDynamicData()
      let that = this;
      fetch('generation_attn.json')
          .then(response => response.json())
          .then(data => {
            that.attnData = data
            that.model_name = that.attnData.model_name
            that.prompt_len = that.attnData.prompt_lis.length
            that.all_tokens = that.prompt_len + that.attnData.output_lis.length
            that.head_cnt = that.attnData.head_count
            that.layer_cnt = that.attnData.layer_count
          })
          .catch(error => {
            console.error('Error:', error);
          });
    },

    resetDynamicData() {
      this.current_layer = 0;
      while (this.current_heads.length > 0) {
        this.current_heads.shift();
      }
      this.attnData = null;
      this.model_name = "VoidModel"
      this.prompt_len = 0;
      this.all_tokens = 0;
      this.head_cnt = 0;
      this.layer_cnt = 0;
      this.colorMap.clear();
      this.colorList = ["red", "lime", "blue", "yellow", "aqua", "magenta"];
    },

    getTopkProbs(sentenceIdx) {

      let topkStr = this.attnData.output_lis[sentenceIdx - this.prompt_len].topk_token_strs;
      let topkProbs = this.attnData.output_lis[sentenceIdx - this.prompt_len].topk_probs;

      let htmlStr = "";
      for (let i = 0; i < topkStr.length; i++) {
        let probPercent = (topkProbs[i] * 100).toFixed(2); // Convert probability to percentage and round to two decimal places
        htmlStr += `${this.processedToken(topkStr[i])} : ${probPercent}%\n`;
      }
      return htmlStr;
    },
    handleReDrawAttn(event) {
      if (this.current_heads.length === 0) {
        this.$alert(
            "Please select at least one head to visualize!",
            'Msg', {
              showClose: false,
              confirmButtonText: 'OK'
            });
        return
      }

      this.clearAllColor()

      let sentenceIdx = event.target.id
      this.underlineToken(sentenceIdx)

      let attnLis = [];
      for (const head_id of this.current_heads) {
        let attnscore = this.getAttnScore(sentenceIdx, this.current_layer, head_id);
        attnLis.push({head_id, attnscore});
      }

      let maxScores = [];
      for (let i = 0; i < attnLis[0].attnscore.length; i++) {
        let maxScore = -Infinity;
        let maxHeadId = null;

        for (let j = 0; j < attnLis.length; j++) {
          if (attnLis[j].attnscore[i] > maxScore) {
            maxScore = attnLis[j].attnscore[i];
            maxHeadId = attnLis[j].head_id;
          }
        }
        maxScores.push([maxHeadId, maxScore]);
      }

      for (let [idx, entry] of maxScores.entries()) {
        let [head_id, score] = entry;
        this.setColorByIdx(idx, this.applyOpacity(this.colorMap.get(head_id), score))
      }
    },

    underlineToken(sentenceIdx) {
      let ref = this.getRef(sentenceIdx)
      let element = this.$refs[ref][0]
      element.style.textDecoration = 'underline';
      element.style.textDecorationColor = 'red';
      element.style.textDecorationThickness = '3px';
    },

    addHead(para) {
      para = parseInt(para[0])
      const c = this.colorList.shift();
      this.colorMap.set(para, c);
      return c
    },

    removeHead(para) {
      para = parseInt(para)
      const c = this.colorMap.get(para);
      this.colorMap.delete(para);
      this.colorList.push(c);
    },

    clearAllColor() {
      for (let idx = 0; idx < this.all_tokens; idx++) {
        this.setColorByIdx(idx, "white", true)
      }
    },

    getAttnScore(sentenceIdx, layer_id, head_id) {
      let output_lis = this.attnData.output_lis
      let thisIdxData = output_lis[sentenceIdx - this.prompt_len]
      let thisLayerData = thisIdxData.attn_score_lis[layer_id]
      let thisHeadData = thisLayerData.layer_score_lis[head_id]
      return thisHeadData.score_lis
    },

    setHeadColorByIdx(headIdx, color) {
      let ref = this.getHeadRef(headIdx)
      let element = this.$refs[ref][0]
      element.style.backgroundColor = color
    },

    setColorByIdx(sentenceIdx, color, clearUnderline = false) {
      let ref = this.getRef(sentenceIdx)
      let element = this.$refs[ref][0]
      element.style.backgroundColor = color
      if (clearUnderline) {
        element.style.textDecoration = 'none';
      }
    },

    applyOpacity(color, opacity) {
      const rgbaColor = this.colorToRGBA(color);
      rgbaColor.a = opacity;
      return this.rgbaToColor(rgbaColor);
    },

    colorToRGBA(color) {
      const tempElement = document.createElement('div');
      tempElement.style.color = color;
      document.body.appendChild(tempElement);
      const computedStyle = getComputedStyle(tempElement);
      const rgbaColor = computedStyle.color.match(/\d+/g).map(Number);
      document.body.removeChild(tempElement);
      return {
        r: rgbaColor[0],
        g: rgbaColor[1],
        b: rgbaColor[2],
        a: rgbaColor[3] / 255
      };
    },

    rgbaToColor(rgbaColor) {
      const {r, g, b, a} = rgbaColor;
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    },
  }
}

</script>

<style>

@font-face {
  font-family: 'DMSans';
  src: url('./assets/DMSans-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.banner {
  font-family: 'DMSans', sans-serif;
  background-color: rgba(255, 5, 5, 0.5);
  background-size: cover;
  height: 10vh;
}

.op-area {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  background-color: cornflowerblue;
  align-items: center;
  height: 5vh;
}

.head-row {
  display: flex;
  justify-content: space-evenly;
  flex-wrap: wrap;
}

.checkbox-container {
  display: flex;
  position: relative;
  cursor: pointer;
  font-size: 22px;
  margin-left: auto;
  margin-right: auto;
  padding: 15px;
  user-select: none;
  transition: background-color 0.3s ease;
}

.head-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.display-panel {
  border-color: #a1a1a1;
  border-width: 1px;
  border-style: solid;
  border-radius: 20px;
  margin-top: 20px;
  margin-left: 10px;
  margin-right: 10px;
  min-height: 300px;
}

.display-panel .head-title {
  font-size: 20px;
  font-weight: bold;
  margin: 10px;
  font-family: 'DMSans', sans-serif
}

.display-panel .text_area {
  font-family: 'DMSans', sans-serif;
  margin: 10px;
}

.display-panel .token-span {
  display: inline-block;
  white-space: pre-wrap;
  cursor: pointer;
  margin-bottom: 2px;
  position: relative;
}

.token-span .tooltip {
  visibility: hidden;
  width: 160px;
  background-color: #555;
  color: #fff;
  text-align: center;
  padding: 5px 0;
  border-radius: 6px;
  position: absolute;
  z-index: 1;
  top: 125%; /* Position the tooltip below the text */
  left: 50%;
  margin-left: -80px; /* Use half of the width to center the tooltip */

  opacity: 0;
  transition: opacity 0.3s;
}

.token-span:hover .tooltip {
  visibility: visible;
  opacity: 1;
}
</style>
