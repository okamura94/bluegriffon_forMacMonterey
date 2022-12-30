# BlueGriffonのMac MontereyでのBuild&Run


# はじめに
 　「BlueGriffon3.1は、macOS 11 Big Surでは、DialogBoxが空白となる。*1)」との問題がありましたので、プログラム等の修正を行い、BuildしmacOS Monterey環境下でも何とか動かす所まで漕ぎ着けました。
 　 mozilla/geckoは、ビギナーですので、対応方法として問題原因の解決が困難なものについては、動かす事を最優先に対応しておりますので新たな問題を含んでいる可能性もあります。
 　 ともあれ、これより更により良くする為、対応が未熟、不十分な事は承知の上で修正したソースを公開したいと思います。知見のある方を含め興味のある方のお力をお借りし、問題原因の解決を含め進化させて行ければと思っております。
 　 また、このような状況ですので、十分なテストを行っている訳ではありませんので悪しからず、ご了承下さい。

# 目次
 - Build & Run環境
 - プログラム等修正概要
 - Build手順
 - DMGファイルによるインストール
 - 修正版ソース、DMGファイルの所在
 - 見えている問題点
 - 参考にさせて頂いたサイト
 - 参考
 
# Build & Run環境
  MacOS Monterey 12.6
  Xcode Version 14.2(14C18)
  rustc version 1.62.1 (入っていなければインストール要) *2)参考
  cargo version 1.62.1　　　　　　　　〃

  ### その他
  nss   version 3.84(入っていなければインストール要)  *3)参考
  Build & Runは、Intel x86 配下で実行。

# プログラム等の主な修正概要
・openGLライブラリーのライブラリー名、ロードディレクトリーの変更。
・Buildエラー対応、SDKバージョンチェックの拡大、Rustバージジョンアップに伴う対応、OSバージョンアップに伴うコンパイルエラー対応等。
・nsChildView.mmの\[mGLContext update\](3750ライン近辺)がMainthreadでないと動かないので修正。
・Dialog表示でWindowTypeがeWindowType_sheetのものは、空白のDialog(原因不明)となる為、eWindowType_dialogに対処的に変更し実行する様、修正。
・Big Sur以降に対応する為、Pale Moon *4)の「macOS 11.0 Big Sur の問題を修正」*5),*6)を参考にプログラム修正。
・VibrancyManager.cppのSystemSupportsVibrancy() Call結果がtrueだとtreecolpickerのmenupopupの表示が上手く出来ない為、強制的にfalseに対処的に変更し実行する様、修正。
・文字表示不正(バックグラウンド白系色に白系色文字の表示等)対応。
・全体的に、動かすことを最優先に対応した為、対応による副作用は不明です。
・その他、「インストール: BlueGriffon 3.1 M1 macOS Big Sur」*7)も参考とさせて頂きました。
・など

# Build手順
  ### 準備作業

　GitHubより[修正版ソース](https://github.com/okamura94/bluegriffon_forMacMonterey)をダウンロード
  
  ### ルートディレクトリーの.mozconfig(Configurationファイル)の修正
  ・実行環境が出来るディレクトリーの指定
    実行環境は、以下のobj変数のディレクトリー配下に作成されます。
    自分の環境に合わせ設定して下さい。

   ```
    obj=$HOME/bluegriffon_forMacMonterey/obj
   ```
  　DMGファイルは、$HOME/bluegriffon_forMacMonterey/obj/dist/bluegriffon-3.2.en-US.mac.dmgとして作成されます。    
  ・SDKを自分の環境に合わせ設定
   ```
    ac_add_options --with-macos-sdk=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk
    ac_add_options --enable-macos-target=12.3
   ```

  ### Build & Run作業
  ルートディレクトリーで以下のコマンドを実行。
  #### buildの実行
   ```
   ./mach build
   ```
  #### アプリケーションの実行
   ```
   ./mach run
   ```
  #### アプリケーションpackage化
   ```
   ./mach package
   ```

  #### 言語対応
   Buildは、en-US(米語版)で生成されます。
   Menu→Preferences→Advanced→Bluegriffon's User InterfaceのUse installed locale:でja(Japanese)を選択することにより日本語化が可能です。
   
  ##### その他
   Build & Runは、Catalinaでも可能です。
   SDKの環境を合わせ設定し実行して下さい。
   
# DMGファイルによるインストール
　DMGファイルを一応用意しました、[ここ](https://github.com/okamura94/bluegriffon_forMacMonterey_dmg)にありますのでダウンロードし、インストールする事も可能です。

# 修正版ソース、DMGファイルの所在
  　[修正版ソース](https://github.com/okamura94/bluegriffon_forMacMonterey)
  　[DMGファイル](https://github.com/okamura94/bluegriffon_forMacMonterey_dmg)
  
  ### Catalina版DMGファイルについて
   　CatalinaでBuildしたDMGも用意しました。
   　  [Catalina版DMGファイル](https://github.com/okamura94/bluegriffon_forMacCatalina_dmg)
   　※このDMGは、Montereyでも動きますのでBig Surでも動くと思われます。(未確認)

# 見えている問題点
  パネルのボタン表示が以下の様に背景黒系色、アクティブは白系色背景で表示されてしまいます。(cssの対応等では上手く行きませんでした。)
  尚、Catalinaでは、問題なく表示されます。
  
![tabs_Button.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/3078240/f43efb12-b9f1-545f-e9c9-758037e1f19e.gif)
 
# 参考にさせて頂いたサイト
[BluGriffon本家ソース](https://github.com/therealglazou/bluegriffon)

*1) [「Mac os big sur et Bluegriffon」](https://groups.google.com/g/bluegriffon/c/pyoDm2JGluA)

*2) [「macOSでRustのローカル開発環境を整えるための手順2022」](https://qiita.com/notakaos/items/9f3ee8a3f3a0caf39f7b)

*3) [「Homebrew Formulae(nssのインストール)」](https://formulae.brew.sh/formula/nss)

*4) [「Pale Moon（ペイル・ムーン）は、Goannaレンダリングエンジンで動くオープンソースウェブブラウザ」](https://ja.wikipedia.org/wiki/Pale_Moon)

*5) [「Fix macOS 11.0 Big Sur issues.」](https://silica.codes/RandomHuman/Mypal/commit/5136ec60100c388db09bb61d31da143dbe36d4e9)

*6) [「RandomHuman/Mypal」](https://silica.codes/RandomHuman/Mypal/src/commit/5136ec60100c388db09bb61d31da143dbe36d4e9)

*7) [「インストール: BlueGriffon 3.1 M1 macOS Big Sur」](https://senooken.jp/post/2022/06/24/)

# 参考
 本家ソースに対する変更概要一覧を以下に記します。
|ファイル名/ディレクトリー名 |フォルダ |変更概要|
|:-----------------|:--------------|:------:|
|floatingpanel.xml|bluegriffon/base/content/bluegriffon/bindings|tooltip id化(文字色対応)|
|tab.xml|bluegriffon/base/content/bluegriffon/bindings|タイトル文字色対応|
|tabeditor.xml|bluegriffon/base/content/bluegriffon/bindings|tooltip id化(文字色対応)|
|aboutDialog.xul|bluegriffon/base/content/bluegriffon/dialogs|bluegriffonDialogs.css追加(文字色対応)|
|convertClipboardToTable.xul|bluegriffon/base/content/bluegriffon/dialogs|tooltip id化(文字色対応)|
|convertToTable.xul|bluegriffon/base/content/bluegriffon/dialogs|tooltip id化(文字色対応)|
|insertDatalist.xul|bluegriffon/base/content/bluegriffon/dialogs|tooltip id化(文字色対応)|
|insertSelect.xul|bluegriffon/base/content/bluegriffon/dialogs|tooltip id化(文字色対応)|
|insertStylesheet.xul|bluegriffon/base/content/bluegriffon/dialogs|tooltip id化(文字色対応)|
|newDocument.xul|bluegriffon/base/content/bluegriffon/dialogs|bluegriffonDialogs.css追加(文字色対応)|
|openLocation.xul|bluegriffon/base/content/bluegriffon/dialogs|bluegriffonDialogs.css追加(文字色対応)|
|parsingError.xul|bluegriffon/base/content/bluegriffon/dialogs|bluegriffonDialogs.css追加(文字色対応)|
|releaseNotes.xul|bluegriffon/base/content/bluegriffon/dialogs|リリース内容等変更|
|updateAvailable.xul|bluegriffon/base/content/bluegriffon/dialogs|bluegriffonDialogs.css追加(文字色対応)|
|file.xul|bluegriffon/base/content/bluegriffon/prefs|文字色対応|
|general.xul|bluegriffon/base/content/bluegriffon/prefs|文字色対応|
|license.xul|bluegriffon/base/content/bluegriffon/prefs|文字色対応|
|newPage.xul|bluegriffon/base/content/bluegriffon/prefs|文字色対応|
|prefs.xul|bluegriffon/base/content/bluegriffon/prefs|文字色対応|
|source.xul|bluegriffon/base/content/bluegriffon/prefs|treecolpickerのmenupopup対応、文字色対応|
|styles.xul|bluegriffon/base/content/bluegriffon/prefs|tooltip id化(文字色対応)|
|bluegriffon.xul|bluegriffon/base/content/bluegriffon/xul|ディフォルトtooltip id定義、treecolpickerのmenupopup対応|
|newPage.dtd|bluegriffon/base/locale/en-US/bluegriffon/prefs|showAnchors.labelの追加|
|codename.txt|bluegriffon/config|リリース名、クォーテーション削除、Buildエラー回避|
|aria.css|bluegriffon/sidebars/aria/skin|文字色白化定義|
|cssproperties.css|bluegriffon/sidebars/cssproperties/skin|文字色白化定義|
|domexplorer.xul|bluegriffon/sidebars/domexplorer/content|tabタグ文字色対応|
|domexplorer.css|bluegriffon/sidebars/domexplorer/skin|同上、文字色対応定義|
|its20.xul|bluegriffon/sidebars/its20/content|tabタグ文字色対応|
|its20.css|bluegriffon/sidebars/its20/skin|同上、文字色対応定義|
|stylesheets.css|bluegriffon/sidebars/stylesheets/skin|treecolpickerのmenupopup対応、文字色対応文字黒化定義|
|prefs.css|bluegriffon/themes/mac/classic/prefs|treecolpickerのmenupopup対応、文字色対応文字黒化定義　等|
|bluegriffon.css|bluegriffon/themes/mac/classic|文字色対応定義|
|bluegriffonDialogs.css|bluegriffon/themes/mac/classic|文字色対応定義|
|formatToolbar.css|bluegriffon/themes/mac/classic|文字色白化定義|
|rules.mk|config|buildエラー対応|
|MacIOSurface.cpp|gfx/2d|OS Version 取得とOpenGLライブラリー切替処理|
|QuartzSupport.mm|gfx/2d|OpenGLライブラリー変更|
|Types.h|gfx/2d|Big Sur対応|
|DisplayCGL.mm|gfx/angle/src/libANGLE/renderer/gl/cgl|OS Version 取得とOpenGLライブラリー切替処理|
|cairo-quartz-font.c|gfx/cairo/cairo/src|Big Sur対応|
|GLContextProviderCGL.mm|gfx/gl|OS Version 取得とOpenGLライブラリー切替処理|
|GrGLCreateNativeInterface_iOS.cpp|gfx/skia/skia/src/gpu/gl/iOS|OS Version 取得とOpenGLライブラリー切替処理|
|GrGLCreateNativeInterface_mac.cpp|gfx/skia/skia/src/gpu/gl/mac|OS Version 取得とOpenGLライブラリー切替処理|
|gfxTextRun.cpp|gfx/thebes|フォントファミリーnull時のエラー回避|
|bindings.rs|gfx/webrender_bindings/src|コンパイルエラー対応|
|XPCShellEnvironment.cpp|ipc/testshell|コンパイルエラー対応|
|nsFloatManager.cpp|layout/generic|コンパイルエラー対応|
|nsStyleConsts.h|layout/style|Big Sur対応、Version取得関係変更|
|nsStyleStruct.h|layout/style|コンパイルエラー対応|
|nsXULTooltipListener.cpp|layout/xul|tooltip色対応(default id取得と文字設定)|
|find_sdk.py|media/webrtc/trunk/build/mac|SDK Versionチェックバイパス|
|screen_capturer_mac.mm|media/webrtc/trunk/webrtc/modules/desktop_capture|OS Version 取得とOpenGLライブラリー切替処理|
|mozillabuild.py|python/mozboot/mozboot|Rust Version対応|
|_psutil_osx.c|python/psutil/psutil|コンパイルエラー対応|
|_psutil_posix.c|python/psutil/psutil|Big Sur対応|
|font.rs|third_party/rust/core-text/src|コンパイルエラー対応|
|font_descriptor.rs|third_party/rust/core-text/src|コンパイルエラー対応|
|.cargo-checksum.json|third_party/rust/core-text|Rust Version up対応|
|encoding.rs|third_party/rust/url/src|Rust Version up対応|
|form_urlencoded.rs|third_party/rust/url/src|Rust Version up対応|
|host.rs|third_party/rust/url/src|Rust Version up対応|
|lib.rs|third_party/rust/url/src|Rust Version up対応|
|origin.rs|third_party/rust/url/src|Rust Version up対応|
|parser.rs|third_party/rust/url/src|Rust Version up対応|
|path_segments.rs|third_party/rust/url/src|Rust Version up対応|
|quirks.rs|third_party/rust/url/src|Rust Version up対応|
|data.rs|third_party/rust/url/tests|Rust Version up対応|
|setters_tests.json|third_party/rust/url/tests|Rust Version up対応|
|unit.rs|third_party/rust/url/tests|Rust Version up対応|
|urltestdata.json|third_party/rust/url/tests|Rust Version up対応|
|.cargo-checksum.json|third_party/rust/url|Rust Version up対応|
|.travis.yml|third_party/rust/url|Rust Version up対応|
|Cargo.toml|third_party/rust/url|Rust Version up対応|
|README.md|third_party/rust/url|Rust Version up対応|
|.cargo-checksum.json|third_party/rust/utf8-ranges|Rust Version up対応|
|Cargo.toml|third_party/rust/utf8-ranges|Rust Version up対応|
|tree.xml|toolkit/content/widgets|treecolpickerのmenupopupにclass定義追加(文字色対応)|
|Cargo.lock|toolkit/library/rust|Rust Version up対応|
|dialog.xul|toolkit/mozapps/handling/content|bluegriffonDialogs.css追加(文字色対応)|
|commonDialog.css|toolkit/themes/osx/global|文字色対応定義|
|dialog.css|toolkit/themes/osx/global|文字色対応定義|
|global.css|toolkit/themes/osx/global|文字色対応追加|
|preferences.css|toolkit/themes/osx/global|文字色対応定義|
|nsNativeAppSupportCocoa.mm|toolkit/xre|OS Version チェックバイパス|
|toolkit.mozbuild|toolkit|Buildエラー対応|
|nsChildView.h|widget/cocoa|Big Sur対応|
|nsChildView.mm|widget/cocoa|Big Sur対応、[mGLContext update]対応|
|nsCocoaFeatures.h|widget/cocoa|Big Sur対応|
|nsCocoaFeatures.mm|widget/cocoa|Big Sur対応|
|nsCocoaWindow.h|widget/cocoa|Big Sur対応|
|nsCocoaWindow.mm|widget/cocoa|Big Sur対応|
|nsNativeThemeCocoa.mm|widget/cocoa|Big Sur対応|
|VibrancyManager.h|widget/cocoa|Big Sur対応|
|VibrancyManager.mm|widget/cocoa|Big Sur対応、SystemSupportsVibrancy()でfalse返却|
|nsTransferable.cpp|widget|MOZ_ASSERT(!mInitialized)を全てコメント化(実行時エラー回避)|
|.cargo-checksum.json|third_party/rust/percent-encoding|Rust Version up対応|
|Cargo.toml|third_party/rust/percent-encoding|Rust Version up対応|
|lib.rs|third_party/rust/percent-encoding|Rust Version up対応|
|LICENSE-APACHE|third_party/rust/percent-encoding|Rust Version up対応|
|LICENSE-MIT|third_party/rust/percent-encoding|Rust Version up対応|
|parse_url.rs|third_party/rust/url/benches|Rust Version up対応|
|forgiving_base64.rs|third_party/rust/url/data-url/src|Rust Version up対応|
|lib.rs|third_party/rust/url/data-url/src|Rust Version up対応|
|make_base64_decode_table.py|third_party/rust/url/data-url/src|Rust Version up対応|
|mime.rs|third_party/rust/url/data-url/src|Rust Version up対応|
|base64.json|third_party/rust/url/data-url/tests|Rust Version up対応|
|data-urls.json|third_party/rust/url/data-url/tests|Rust Version up対応|
|generated-mime-types.json|third_party/rust/url/data-url/tests|Rust Version up対応|
|mime-types.json|third_party/rust/url/data-url/tests|Rust Version up対応|
|wpt.rs|third_party/rust/url/data-url/tests|Rust Version up対応|
|Cargo.toml|third_party/rust/url/data-url|Rust Version up対応|
|LICENSE-APACHE|third_party/rust/url/data-url|Rust Version up対応|
|LICENSE-MIT|third_party/rust/url/data-url|Rust Version up対応|
|README.md|third_party/rust/url/data-url|Rust Version up対応|
|parse.rs|third_party/rust/url/fuzz/fuzz_targets|Rust Version up対応|
|.gitignore|third_party/rust/url/fuzz|Rust Version up対応|
|Cargo.toml|third_party/rust/url/fuzz|Rust Version up対応|
|IdnaMappingTable.txt|third_party/rust/url/idna/src|Rust Version up対応|
|lib.rs|third_party/rust/url/idna/src|Rust Version up対応|
|make_uts46_mapping_table.py|third_party/rust/url/idna/src|Rust Version up対応|
|punycode.rs|third_party/rust/url/idna/src|Rust Version up対応|
|uts46.rs|third_party/rust/url/idna/src|Rust Version up対応|
|uts46_mapping_table.rs|third_party/rust/url/idna/src|Rust Version up対応|
|IdnaTest.txt|third_party/rust/url/idna/tests|Rust Version up対応|
|punycode.rs|third_party/rust/url/idna/tests|Rust Version up対応|
|punycode_tests.json|third_party/rust/url/idna/tests|Rust Version up対応|
|tests.rs|third_party/rust/url/idna/tests|Rust Version up対応|
|unit.rs|third_party/rust/url/idna/tests|Rust Version up対応|
|uts46.rs|third_party/rust/url/idna/tests|Rust Version up対応|
|Cargo.toml|third_party/rust/url/idna|Rust Version up対応|
|LICENSE-APACHE|third_party/rust/url/idna|Rust Version up対応|
|LICENSE-MIT|third_party/rust/url/idna|Rust Version up対応|
|lib.rs|third_party/rust/url/url_serde/src|Rust Version up対応|
|Cargo.toml|third_party/rust/url/url_serde|Rust Version up対応|
|LICENSE-APACHE|third_party/rust/url/url_serde|Rust Version up対応|
|LICENSE-MIT|third_party/rust/url/url_serde|Rust Version up対応|
|README.md|third_party/rust/url/url_serde|Rust Version up対応|
|Cargo.lock|third_party/rust/url|Rust Version up対応|
|nsScreenCocoa.h|widget/cocoa|Big Sur対応|
|.mozconfig||Build用Configファイル|
